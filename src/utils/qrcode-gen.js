export const moduleStyles = {
  tiles: { radius: 0, margin: 0 },
  tiles_r: { radius: 0.2, margin: 0.1 },
  dots_s: { radius: 0.4, margin: 0.1 },
  dots_xs: { radius: 0.25, margin: 0.2 },
  dots_l: { radius: 0.6, margin: -0.1 },
};

export const moduleStyleNames = Object.keys(moduleStyles);

function generateFinderStyles() {
  const finderStyles = {};

  for (const w of [1, 1.3, 0.7]) {
    for (const r of [0, 0.5, 1]) {
      finderStyles[`r${r * 100}w${w * 100}`] = {
        outerRadiusFactor: 0.5 * r, // Multiplied by 7 for actual radius for the 7x7 box
        innerRadiusFactor: 0.5 * r, // Multiplied by 3 for actual radius for the 3x3 inner
        outerWidthAbs: 1 * w, // Absolute stroke width for the 7x7 box
        innerWidthAbs: 3 * 1, // Absolute width for the 3x3 inner
      };
    }
  }
  return finderStyles;
}

export const finderStyles = generateFinderStyles();

export const finderStyleNames = Object.keys(finderStyles);
