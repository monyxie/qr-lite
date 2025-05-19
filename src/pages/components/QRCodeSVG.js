import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { PropTypes } from "prop-types";
import {
  EncodeHintType,
  QRCodeDecoderErrorCorrectionLevel,
  QRCodeEncoder,
} from "@zxing/library";
import { finderStyles, moduleStyles } from "../../utils/qrcode-gen";

/**
 * Generates SVG elements for the finder patterns.
 * @param {object} matrix - The QRCode matrix.
 * @param {number} quietZone - The quiet zone margin.
 * @param {string} foregroundColor - The color of the QR code.
 * @param {object} finderOpts - Options for finder style.
 * @param {number} moduleS - The fill size of a module (0 to 1).
 * @param {number} moduleR - The radius of a module (0 to 0.5).
 * @param {function} [onClickFinders] - Optional callback for finder clicks.
 * @returns {Array<React.ReactElement>} - Array of SVG elements for finders.
 */
function generateFinderElements(
  matrix,
  quietZone,
  foregroundColor,
  finderOpts,
  moduleS,
  moduleR,
  onClickFinders
) {
  const { outerRadiusFactor, innerRadiusFactor, outerWidthAbs, innerWidthAbs } =
    finderOpts;

  const matrixWidth = matrix.getWidth();
  const matrixHeight = matrix.getHeight();

  const elements = [];
  const findersCoordinates = [
    { x: 0, y: 0, id: "tl" }, // Top-left
    { x: 0, y: matrixHeight - 7, id: "bl" }, // Bottom-left
    { x: matrixWidth - 7, y: 0, id: "tr" }, // Top-right
  ];

  const handleFinderClick = (event) => {
    if (onClickFinders) {
      onClickFinders(event);
    }
    event.stopPropagation();
  };

  const lineCap = moduleR > 0 ? "round" : "square";
  let or, ir, ow, iw;

  // Outer Radius (or) for the 7x7 box
  if (typeof outerRadiusFactor !== "undefined") {
    or = 7 * outerRadiusFactor;
  } else {
    or = moduleR * 4; // Default based on module radius
  }

  // Inner Radius (ir) for the 3x3 solid center
  if (typeof innerRadiusFactor !== "undefined") {
    ir = 3 * innerRadiusFactor;
  } else {
    ir = moduleR * 2; // Default based on module radius
  }

  // Outer Width (ow) - stroke width of the 7x7 box
  if (typeof outerWidthAbs !== "undefined") {
    ow = outerWidthAbs;
  } else {
    ow = moduleS; // Default based on module fill size
  }

  // Inner Width (iw) - size of the 3x3 solid center
  if (typeof innerWidthAbs !== "undefined") {
    iw = innerWidthAbs;
  } else {
    // Original default was 3 - M * 2. Since moduleS = 1 - M * 2, then M*2 = 1 - moduleS.
    // So, iw = 3 - (1 - moduleS) = 2 + moduleS.
    iw = 2 + moduleS;
  }

  findersCoordinates.forEach((finder) => {
    const { x: fX, y: fY } = finder;

    elements.push(
      <g
        key={`fg-${fX}-${fY}-${matrixWidth}`}
        onClick={onClickFinders ? handleFinderClick : undefined}
        style={{ cursor: onClickFinders ? "pointer" : "default" }}
      >
        <rect
          // key is now on <g>
          x={quietZone + fX + 0.5}
          y={quietZone + fY + 0.5}
          width={6}
          height={6}
          stroke={foregroundColor}
          strokeWidth={ow}
          strokeLinecap={lineCap}
          rx={or}
          fill="transparent"
          style={{ transition: "all 0.2s" }}
        ></rect>
        <rect
          // key is now on <g>
          x={quietZone + fX + 2 + (3 - iw) / 2}
          y={quietZone + fY + 2 + (3 - iw) / 2}
          width={iw}
          height={iw}
          rx={ir}
          fill={foregroundColor}
          style={{ transition: "all 0.2s" }}
        ></rect>
      </g>
    );
  });
  return elements;
}

/**
 * Generates the SVG path string for the QR code modules.
 * @param {object} matrix - The QRCode matrix.
 * @param {number} quietZone - The quiet zone margin.
 * @param {object} moduleOpts - Options for module style {radius, margin}.
 * @returns {{d: string, S: number, R: number}} - Path data, module fill size, and module radius.
 */
function generateModulePath(matrix, quietZone, moduleOpts) {
  const { radius: R, margin: M } = moduleOpts;
  const S = 1 - M * 2; // module fill size

  const matrixWidth = matrix.getWidth();
  const matrixHeight = matrix.getHeight();

  const shouldSkip = (x, y) =>
    (x < 7 && (y < 7 || y >= matrixHeight - 7)) ||
    (x >= matrixWidth - 7 && y < 7);

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

        // Below, the arc segments aren't always necessary for R=0
        // but we keep them so the CSS transition works smoothly when R changes.
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
  return { d, S, R };
}

/**
 * A React component to render QR Codes as SVG.
 *
 * Uses @zxing/library for QR code generation.
 */
const QRCodeSVG = forwardRef(function QRCodeSVG(
  {
    onClick,
    onClickFinders,
    content,
    width,
    height,
    errorCorrectionLevel: errorCorrectionLevelProp = "L",
    margin: quietZone = 4,
    moduleStyle: moduleStyleName = "tiles",
    finderStyle: finderStyleName = "default",
    foregroundColor = "#000000", // Default foreground color to black
    backgroundColor = "#ffffff", // Default background color to white
  },
  ref
) {
  useImperativeHandle(ref, () => ({}));

  const svgElement = useMemo(() => {
    if (content.length === 0) {
      return null;
    }
    if (width < 0 || height < 0) {
      console.error(
        `[QRCodeSVG] Error: Requested dimensions are too small: ${width}x${height}`
      );
      return null;
    }

    try {
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

      const currentModuleOpts =
        moduleStyles[moduleStyleName] ||
        moduleStyles[Object.keys(moduleStyles)[0]];
      const currentFinderOpts =
        finderStyles[finderStyleName] ||
        finderStyles[Object.keys(finderStyles)[0]];

      const {
        d: modulePath,
        S: moduleS,
        R: moduleR,
      } = generateModulePath(matrix, quietZone, currentModuleOpts);

      const finderElements = generateFinderElements(
        matrix,
        quietZone,
        foregroundColor,
        currentFinderOpts,
        moduleS,
        moduleR,
        onClickFinders
      );

      const svgElements = [...finderElements];
      if (modulePath) {
        svgElements.push(
          <path
            key="module-path"
            d={modulePath}
            fill={foregroundColor}
            style={{ transition: "all 0.2s" }}
          />
        );
      }

      const calculatedWidth = matrix.getWidth() + quietZone * 2;
      const calculatedHeight = matrix.getHeight() + quietZone * 2;

      return (
        <svg
          height={height}
          width={width}
          viewBox={`0 0 ${calculatedWidth} ${calculatedHeight}`}
          xmlns="http://www.w3.org/2000/svg"
          onClick={onClick}
        >
          <rect
            x="0"
            y="0"
            width={calculatedWidth}
            height={calculatedHeight}
            fill={backgroundColor}
          />
          {svgElements}
        </svg>
      );
    } catch (error) {
      console.error("[QRCodeSVG] Error generating QR Code:", error);
      return (
        <svg
          onClick={onClick}
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
    moduleStyleName,
    finderStyleName,
    foregroundColor,
    backgroundColor,
    onClickFinders,
    onClick,
  ]);

  return svgElement;
});

QRCodeSVG.propTypes = {
  ref: PropTypes.any,
  onClick: PropTypes.func,
  onClickFinders: PropTypes.func,
  content: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  errorCorrectionLevel: PropTypes.oneOf(["L", "M", "Q", "H"]),
  margin: PropTypes.number, // quietZone
  foregroundColor: PropTypes.string,
  backgroundColor: PropTypes.string,
  moduleStyle: PropTypes.oneOf(Object.keys(moduleStyles)),
  finderStyle: PropTypes.oneOf(Object.keys(finderStyles)),
};
export default QRCodeSVG;
