import React, { useMemo } from "react";
import {
  EncodeHintType,
  QRCodeDecoderErrorCorrectionLevel,
  QRCodeEncoder,
} from "@zxing/library";

/**
 * A React component to render QR Codes as SVG.
 *
 * Uses @zxing/library for QR code generation.
 */
export default function QRCodeSVG({
  content,
  width,
  height,
  errorCorrectionLevel: errorCorrectionLevelProp = "L",
  margin: quietZone = 4,
  foregroundColor = "#000000", // Default foreground color to black
  backgroundColor = "#ffffff", // Default background color to white
}) {
  const svgElement = useMemo(() => {
    if (content.length === 0) {
      console.error("[QRCodeSVG] Error: Found empty contents");
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

      const matrixWidth = matrix.getWidth();
      const matrixHeight = matrix.getHeight();
      // qr size in number of modules
      const qrWidth = matrixWidth + quietZone * 2;
      const qrHeight = matrixHeight + quietZone * 2;
      // image size
      const imageWidth = Math.max(width, qrWidth);
      const imageHeight = Math.max(height, qrHeight);

      // module size
      const multiple = Math.min(
        Math.floor(imageWidth / qrWidth),
        Math.floor(imageHeight / qrHeight)
      );

      const leftPadding = Math.floor((imageWidth - matrixWidth * multiple) / 2);
      const topPadding = Math.floor(
        (imageHeight - matrixHeight * multiple) / 2
      );

      // --- Generate SVG Rect elements ---
      const rects = [];
      let key = 0;
      for (
        let inputY = 0, outputY = topPadding;
        inputY < matrixHeight;
        inputY++, outputY += multiple
      ) {
        for (
          let inputX = 0, outputX = leftPadding;
          inputX < matrixWidth;
          inputX++, outputX += multiple
        ) {
          if (matrix.get(inputX, inputY) === 1) {
            // If the module is black (1)
            rects.push(
              <rect
                key={key++} // Add unique key for React list rendering
                x={outputX}
                y={outputY}
                width={multiple}
                height={multiple}
                fill={foregroundColor} // Use specified foreground color
              />
            );
          }
        }
      }

      // --- Return the complete SVG structure as JSX ---
      return (
        <svg
          height={height} // Use the requested height
          width={width} // Use the requested width
          viewBox={`0 0 ${imageWidth} ${imageHeight}`} // Adjust viewBox for scaling/padding
          xmlns="http://www.w3.org/2000/svg"
          shapeRendering="crispEdges" // Optional: makes edges sharper
        >
          {/* Add background rectangle with the specified background color */}
          <rect
            x="0"
            y="0"
            width={imageWidth}
            height={imageHeight}
            fill={backgroundColor} // Use specified background color
          />
          {/* Render the black QR code modules */}
          {rects}
        </svg>
      );
    } catch (error) {
      console.error("[QRCodeSVG] Error generating QR Code:", error);
      // Handle encoding errors (e.g., content too long for EC level)
      // Return null or an error indicator SVG
      return (
        <svg
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
    foregroundColor,
    backgroundColor,
  ]);

  return svgElement;
}
