import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { PropTypes } from "prop-types";
import {
  EncodeHintType,
  QRCodeDecoderErrorCorrectionLevel,
  QRCodeEncoder,
} from "@zxing/library";
import { finderStyles, moduleStyles } from "../../utils/qrcode-gen";

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {number} boxSize
 * @param {number} drawSize
 * @param {number[]} r
 * @param {number[]} sweep
 * @returns
 */
function generateShapeD(x, y, boxSize, drawSize, r, sweep) {
  const m = (boxSize - drawSize) / 2;
  // Below, the arc segments aren't always necessary for R=0
  // but we keep them so the CSS transition works smoothly when R changes.
  return (
    `M ${x + m} ${y + m + r[0]}` +
    `a ${r[0]} ${r[0]} 0 0 ${sweep[0]} ${r[0]} ${-r[0]}` +
    `l ${drawSize - r[0] - r[1]} 0` +
    `a ${r[1]} ${r[1]} 0 0 ${sweep[1]} ${r[1]} ${r[1]}` +
    `l 0 ${drawSize - r[1] - r[2]}` +
    `a ${r[2]} ${r[2]} 0 0 ${sweep[2]} ${-r[2]} ${r[2]}` +
    `l ${-(drawSize - r[2] - r[3])} 0` +
    `a ${r[3]} ${r[3]} 0 0 ${sweep[3]} ${-r[3]} ${-r[3]}` +
    `Z`
  );
}

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
  opts,
  onClickFinders
) {
  // everything in opts is porpotional
  for (const i of ["r1", "r2", "r3"]) {
    if (opts[i] === undefined) {
      opts[i] = [0, 0, 0, 0];
    } else if (typeof opts[i] === "number") {
      opts[i] = [0, 0, 0, 0].map(() => opts[i]);
    } else if (opts[i] instanceof Array && opts[i].length === 4) {
      // noop
    } else if (
      typeof opts[i] === "object" &&
      opts[i].tl &&
      opts[i].tr &&
      opts[i].bl &&
      opts[i].tl.length === 4 &&
      opts[i].tr.length === 4 &&
      opts[i].bl.length === 4
    ) {
      // noop
    } else {
      throw new Error("Invalid opts");
    }
  }

  for (const i of ["w1", "w2"]) {
    if (opts[i] === undefined) {
      opts[i] = 1;
    } else if (typeof opts[i] !== "number") {
      throw new Error("Invalid opts");
    }
  }

  // calculated, absolute measurements
  const A = {};
  for (const p of ["tl", "tr", "bl"]) {
    A[p] = {};
    //
    A[p].m1 = (1 - opts.w1) / 2;
    A[p].m2 = A[p].m1 + opts.w1;
    A[p].m3 = (7 - 3 * opts.w2) / 2;

    //
    A[p].r1 = (opts.r1[p] || opts.r1).map((r) => (7 - A[p].m1 * 2) * r);
    A[p].r2 = (opts.r2[p] || opts.r2).map((r) => (7 - A[p].m2 * 2) * r);
    A[p].r3 = (opts.r3[p] || opts.r3).map((r) => (7 - A[p].m3 * 2) * r);

    //
    A[p].sweep1 =
      "sweep1" in opts
        ? p in opts.sweep1
          ? opts.sweep1[p]
          : opts.sweep1
        : [1, 1, 1, 1];
    A[p].sweep2 =
      "sweep2" in opts
        ? p in opts.sweep2
          ? opts.sweep2[p]
          : opts.sweep2
        : [1, 1, 1, 1];
    A[p].sweep3 =
      "sweep3" in opts
        ? p in opts.sweep3
          ? opts.sweep3[p]
          : opts.sweep3
        : [1, 1, 1, 1];
  }

  const matrixWidth = matrix.getWidth();
  const matrixHeight = matrix.getHeight();

  const elements = [];

  const handleFinderClick = (event) => {
    if (onClickFinders) {
      onClickFinders(event);
    }
    event.stopPropagation();
  };

  const findersCoordinates = [
    { x: quietZone + 0, y: quietZone + 0, key: "tl" },
    { x: quietZone + 0, y: matrixHeight + quietZone - 7, key: "bl" },
    { x: matrixWidth + quietZone - 7, y: quietZone, key: "tr" },
  ];

  findersCoordinates.forEach((f) => {
    elements.push(
      <g
        key={`fg-${f.x}-${f.y}-${matrixWidth}`}
        onClick={onClickFinders ? handleFinderClick : undefined}
        style={{ cursor: onClickFinders ? "pointer" : "default" }}
      >
        <rect x={f.x} y={f.y} width={7} height={7} fill="transparent"></rect>
        <path
          d={
            generateShapeD(
              f.x + 0,
              f.y + 0,
              7,
              7 - 2 * A[f.key].m1,
              A[f.key].r1,
              A[f.key].sweep1
            ) +
            generateShapeD(
              f.x + 1,
              f.y + 1,
              5,
              7 - 2 * A[f.key].m2,
              A[f.key].r2,
              A[f.key].sweep2
            ) +
            generateShapeD(
              f.x + 2,
              f.y + 2,
              3,
              7 - 2 * A[f.key].m3,
              A[f.key].r3,
              A[f.key].sweep3
            )
          }
          fill={foregroundColor}
          fillRule="evenodd"
          style={{ transition: "all 0.2s" }}
        ></path>
      </g>
    );
  });
  return elements;
}

/**
 * Generates the SVG path string for the QR code modules.
 * @param {object} matrix - The QRCode matrix.
 * @param {number} quietZone - The quiet zone margin.
 * @param {object} opts - Options for module style {radius, margin}.
 * @returns {{d: string, S: number, R: number}} - Path data, module fill size, and module radius.
 */
function generateModulePath(matrix, quietZone, opts) {
  let { radius, margin, sweep } = opts;
  if (margin === undefined) {
    margin = 0;
  } else if (typeof margin !== "number") {
    throw new Error("Invalid opts");
  }

  // validate and convert radius to absolute measures
  if (radius === undefined) {
    radius = [0, 0, 0, 0];
  } else if (typeof radius === "number") {
    radius = [0, 0, 0, 0].map(() => radius * (1 - 2 * margin));
  } else if (radius instanceof Array) {
    radius = radius.map((x) => x * (1 - 2 * margin));
  } else {
    throw new Error("Invalid opts");
  }

  if (sweep === undefined) {
    sweep = [1, 1, 1, 1];
  } else if (typeof sweep === "number") {
    sweep = [0, 0, 0, 0].map(() => sweep);
  } else if (sweep instanceof Array) {
    // noop
  } else {
    throw new Error("Invalid opts");
  }

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
        d += generateShapeD(outputX, outputY, 1, 1 - margin * 2, radius, sweep);
      }
    }
  }
  return d;
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

      const modulePath = generateModulePath(
        matrix,
        quietZone,
        currentModuleOpts
      );

      const finderElements = generateFinderElements(
        matrix,
        quietZone,
        foregroundColor,
        currentFinderOpts,
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
