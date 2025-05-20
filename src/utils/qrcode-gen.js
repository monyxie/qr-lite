function rotate90(arr) {
  return [arr[3], arr[0], arr[1], arr[2]];
}

function rotate270(arr) {
  return [arr[1], arr[2], arr[3], arr[0]];
}

export const moduleStyles = {
  tiles: { radius: 0, margin: 0 },
  tiles_r: { radius: 0.2, margin: 0.1 },
  dots_s: { radius: 0.4, margin: 0.1 },
  dots_xs: { radius: 0.25, margin: 0.2 },
  dots_l: { radius: 0.5, margin: -0.1 },
  eyes_0: { radius: [0.5, 0, 0.5, 0], margin: 0.1 },
  eyes_90: { radius: [0, 0.5, 0, 0.5], margin: 0.1 },
  drops_0: { radius: [0.5, 0.5, 0.5, 0], margin: 0.1 },
  drops_90: { radius: [0, 0.5, 0.5, 0.5], margin: 0.1 },
  drops_180: { radius: [0.5, 0, 0.5, 0.5], margin: 0.1 },
  drops_270: { radius: [0.5, 0.5, 0, 0.5], margin: 0.1 },
  crosses: {
    radius: [0.25, 0.25, 0.25, 0.25],
    sweep: 0,
    margin: 0,
  },
  stars: {
    radius: [0.5, 0.5, 0.5, 0.5],
    sweep: 0,
    margin: -0.3 /* bigger for easier scanning */,
  },
};

export const moduleStyleNames = Object.keys(moduleStyles);

function generateFinderStyles() {
  const f_rotate90 = (style, direction) => {
    const newStyle = { ...style };
    for (const key of ["r1", "r2", "r3"]) {
      if (newStyle[key] instanceof Array) {
        newStyle[key] = rotate90(newStyle[key], direction);
      }
    }
    return newStyle;
  };

  const f_centripetal = (style) => {
    const newStyle = { ...style };
    for (const key of ["r1", "r2", "r3"]) {
      if (newStyle[key] instanceof Array) {
        newStyle[key] = {
          tl: newStyle[key],
          tr: rotate90(newStyle[key]),
          bl: rotate270(newStyle[key]),
        };
      }
    }
    return newStyle;
  };

  const finderStyles = {};
  finderStyles.default = {
    r1: 0,
    r2: 0,
    r3: 0,
    w1: 1,
    w2: 1,
  };

  finderStyles.round = {
    r1: [0.15, 0.15, 0.15, 0.15],
    r2: [0.15, 0.15, 0.15, 0.15],
    r3: [0.15, 0.15, 0.15, 0.15],
    w1: 1,
    w2: 1,
  };

  finderStyles.rounder = {
    r1: [0.3, 0.3, 0.3, 0.3],
    r2: [0.3, 0.3, 0.3, 0.3],
    r3: [0.3, 0.3, 0.3, 0.3],
    w1: 1,
    w2: 1,
  };

  finderStyles.roundest = {
    r1: [0.5, 0.5, 0.5, 0.5],
    r2: [0.5, 0.5, 0.5, 0.5],
    r3: [0.5, 0.5, 0.5, 0.5],
    w1: 1,
    w2: 1,
  };

  finderStyles.tongqian_a = {
    r1: [0.5, 0.5, 0.5, 0.5],
    r2: [0.5, 0.5, 0.5, 0.5],
    r3: [0.1, 0.1, 0.1, 0.1],
    w1: 1,
    w2: 1,
  };
  finderStyles.tongqian_b = {
    r1: [0.5, 0.5, 0.5, 0.5],
    r2: [0.5, 0.5, 0.5, 0.5],
    r3: [0.5, 0.5, 0.5, 0.5],
    w1: 1,
    w2: 1.5,
    sweep3: [0, 0, 0, 0],
  };

  finderStyles.eyes_0 = {
    r1: [0.5, 0, 0.5, 0],
    r2: [0.5, 0, 0.5, 0],
    r3: [0.5, 0.5, 0.5, 0.5],
    w1: 1,
    w2: 1,
  };
  finderStyles.eyes_90 = f_rotate90(finderStyles.eyes_0);
  finderStyles.eyes_cen_0 = f_centripetal(finderStyles.eyes_0);
  finderStyles.eyes_cen_90 = f_centripetal(finderStyles.eyes_90);

  finderStyles.drops_0 = {
    r1: [0.5, 0.5, 0.5, 0],
    r2: [0.5, 0.5, 0.5, 0.5],
    r3: [0.5, 0.5, 0.5, 0.5],
    w1: 1,
    w2: 1,
  };
  finderStyles.drops_90 = f_rotate90(finderStyles.drops_0);
  finderStyles.drops_180 = f_rotate90(finderStyles.drops_90);
  finderStyles.drops_270 = f_rotate90(finderStyles.drops_180);
  finderStyles.drops_cen_0 = f_centripetal(finderStyles.drops_0);
  finderStyles.drops_cen_90 = f_centripetal(finderStyles.drops_90);
  finderStyles.drops_cen_180 = f_centripetal(finderStyles.drops_180);
  finderStyles.drops_cen_270 = f_centripetal(finderStyles.drops_270);

  return finderStyles;
}

export const finderStyles = generateFinderStyles();
export const finderStyleNames = Object.keys(finderStyles);
