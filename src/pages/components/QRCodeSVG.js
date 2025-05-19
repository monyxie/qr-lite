import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { PropTypes } from "prop-types";
import {
  EncodeHintType,
  QRCodeDecoderErrorCorrectionLevel,
  QRCodeEncoder,
} from "@zxing/library";

function makeTileBasedRenderrer({
  radius: R,
  margin: M,
  useSolidFinders = true,
  finderOuterRadius,
  finderInnerRadius,
  finderOuterWidth,
  finderInnerWidth,
}) {
  const S = 1 - M * 2; // fill size

  return function (matrix, quietZone, foregroundColor) {
    const matrixWidth = matrix.getWidth();
    const matrixHeight = matrix.getHeight();
    const shouldSkip = useSolidFinders
      ? (x, y) => {
          return (
            (x < 7 && (y < 7 || y >= matrixHeight - 7)) ||
            (x >= matrixWidth - 7 && y < 7)
          );
        }
      : () => false;

    const elements = [];
    if (useSolidFinders) {
      const lineCap = R > 0 ? "round" : "square";
      let or, ir, ow, iw;
      if (typeof finderOuterRadius === "undefined") {
        or = R * 4;
      } else {
        or = 7 * finderOuterRadius;
      }
      if (typeof finderInnerRadius === "undefined") {
        ir = R * 2;
      } else {
        ir = 3 * finderInnerRadius;
      }

      if (typeof finderOuterWidth === "undefined") {
        ow = S;
      } else {
        ow = finderOuterWidth;
      }
      if (typeof finderInnerWidth === "undefined") {
        iw = 3 - M * 2;
      } else {
        iw = finderInnerWidth;
      }

      const finders = [
        { x: 0, y: 0 },
        { x: 0, y: matrixHeight - 7 },
        { x: matrixWidth - 7, y: 0 },
      ];
      for (const f of finders) {
        elements.push(
          <rect
            key={matrixWidth} // prevents the css transition causing the finder to move when qr code version changes
            x={quietZone + f.x + 0.5}
            y={quietZone + f.y + 0.5}
            width={6}
            height={6}
            stroke={foregroundColor}
            strokeWidth={ow}
            strokeLinecap={lineCap}
            rx={or}
            fill="none"
            style="transition: all 0.2s"
          ></rect>
        );
        elements.push(
          <rect
            key={matrixWidth}
            x={quietZone + f.x + 2 + (3 - iw) / 2}
            y={quietZone + f.y + 2 + (3 - iw) / 2}
            width={iw}
            height={iw}
            rx={ir}
            fill={foregroundColor}
            style="transition: all 0.2s"
          ></rect>
        );
      }
    }

    let d = "";
    for (
      let inputY = 0, outputY = quietZone;
      inputY < matrixHeight;
      inputY++, outputY++
    ) {
      for (
        let inputX = 0, outputX = quietZone;
        inputX < matrixWidth;
        inputX++, outputX++
      ) {
        if (shouldSkip(inputX, inputY)) {
          continue;
        }

        if (matrix.get(inputX, inputY) === 1) {
          const x = outputX + M;
          const y = outputY + M;

          // below, the arc segments aren't always necessary
          // but we keep them or the css transition won't work
          d += `M${x + R} ${y} `; // Move to top-left rounded corner start
          d += `L${x + S - R} ${y} `; // Line to top-right rounded corner start
          d += `A${R} ${R} 0 0 1 ${x + S} ${y + R} `; // Arc for top-right corner
          d += `L${x + S} ${y + S - R} `; // Line to bottom-right rounded corner start
          d += `A${R} ${R} 0 0 1 ${x + S - R} ${y + S} `; // Arc for bottom-right corner
          d += `L${x + R} ${y + S} `; // Line to bottom-left rounded corner start
          d += `A${R} ${R} 0 0 1 ${x} ${y + S - R} `; // Arc for bottom-left corner
          d += `L${x} ${y + R} `; // Line to top-left rounded corner end
          d += `A${R} ${R} 0 0 1 ${x + R} ${y} `; // Arc for top-left corner
          d += "Z";
        }
      }
    }

    elements.push(
      <path d={d} fill={foregroundColor} style="transition: all 0.2s" />
    );

    return {
      elements,
      width: matrixWidth + quietZone * 2,
      height: matrixHeight + quietZone * 2,
    };
  };
}

const qrCodeStyles = {
  tiles: makeTileBasedRenderrer({ radius: 0, margin: 0 }),
  tiles_r: makeTileBasedRenderrer({ radius: 0.2, margin: 0.1 }),
  // dots: makeTileBasedRenderrer({ radius: 0.5, margin: 0 }),
  dots_s: makeTileBasedRenderrer({ radius: 0.4, margin: 0.1 }),
  dots_xs_rf: makeTileBasedRenderrer({
    radius: 0.25,
    margin: 0.2,
    finderOuterRadius: 0.5,
    finderInnerRadius: 0.5,
    finderOuterWidth: 0.8,
    finderInnerWidth: 2.4,
  }),
};

/**
 * A React component to render QR Codes as SVG.
 *
 * Uses @zxing/library for QR code generation.
 */
const QRCodeSVG = forwardRef(function QRCodeSVG(
  {
    onClick,
    content,
    width,
    height,
    errorCorrectionLevel: errorCorrectionLevelProp = "L",
    margin: quietZone = 4,
    qrCodeStyle = "tiles",
    foregroundColor = "#000000", // Default foreground color to black
    backgroundColor = "#ffffff", // Default background color to white
  },
  ref
) {
  useImperativeHandle(ref, () => ({}));

  const svgElement = useMemo(() => {
    if (content.length === 0) {
      // console.error("[QRCodeSVG] Error: Found empty contents");
      return null;
    }
    if (width < 0 || height < 0) {
      console.error(
        `[QRCodeSVG] Error: Requested dimensions are too small: ${width}x${height}`
      );
      return null;
    }

    try {
      // --- Setup Encoding Hints ---
      const hints = new Map();
      const ecLevel = QRCodeDecoderErrorCorrectionLevel.fromString(
        errorCorrectionLevelProp
      );
      hints.set(EncodeHintType.ERROR_CORRECTION, ecLevel);
      hints.set(EncodeHintType.MARGIN, quietZone);

      const code = QRCodeEncoder.encode(content, ecLevel, hints);
      const matrix = code.getMatrix();
      if (matrix === null) {
        throw new Error("Error generating QR Code matrix.");
      }

      // --- Generate SVG Rect elements ---
      const renderResult = (qrCodeStyles[qrCodeStyle] || qrCodeStyles.tiles)(
        matrix,
        quietZone,
        foregroundColor
      );

      // --- Return the complete SVG structure as JSX ---
      return (
        <svg
          height={height} // Use the requested height
          width={width} // Use the requested width
          viewBox={`0 0 ${renderResult.width} ${renderResult.height}`} // Adjust viewBox for scaling/padding
          xmlns="http://www.w3.org/2000/svg"
          // shapeRendering="crispEdges" // Optional: makes edges sharper
          onClick={(e) => {
            if (onClick) {
              onClick(e);
            }
          }}
        >
          {/* Add background rectangle with the specified background color */}
          <rect
            x="0"
            y="0"
            width={renderResult.width}
            height={renderResult.height}
            fill={backgroundColor} // Use specified background color
          />
          {/* Render the black QR code modules */}
          {renderResult.elements}
        </svg>
      );
    } catch (error) {
      console.error("[QRCodeSVG] Error generating QR Code:", error);
      // Handle encoding errors (e.g., content too long for EC level)
      // Return null or an error indicator SVG
      return (
        <svg
          onClick={(e) => {
            if (onClick) {
              onClick(e);
            }
          }}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <text
            x={width / 2}
            y={height / 2}
            fill="red"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            Error
          </text>
        </svg>
      );
    }
  }, [
    content,
    width,
    height,
    errorCorrectionLevelProp,
    quietZone,
    qrCodeStyle,
    foregroundColor,
    backgroundColor,
    onClick,
  ]);

  return svgElement;
});

QRCodeSVG.propTypes = {
  ref: PropTypes.any,
  onClick: PropTypes.func,
  content: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  errorCorrectionLevel: PropTypes.oneOf(["L", "M", "Q", "H"]),
  margin: PropTypes.number,
  foregroundColor: PropTypes.string,
  backgroundColor: PropTypes.string,
  qrCodeStyle: PropTypes.oneOf(["tiles", "dots"]),
};
export default QRCodeSVG;
