function rotate90(arr) {
  return [arr[3], arr[0], arr[1], arr[2]];
}

function rotate270(arr) {
  return [arr[1], arr[2], arr[3], arr[0]];
}

function liquid(context, x, y, boxSize) {
  // context
  // 0 1 2
  // 3 4 5
  // 6 7 8
  if (context[4]) {
    // center is set
    const sr = 0.5;
    const sweep = 1, arc = 1;
    const r = [
      context[0] || context[1] || context[3] ? 0 : sr,
      context[1] || context[2] || context[5] ? 0 : sr,
      context[5] || context[7] || context[8] ? 0 : sr,
      context[3] || context[6] || context[7] ? 0 : sr,
    ];
    return (
      `M ${x} ${y + r[0]}` +
      `a ${arc * r[0]} ${arc * r[0]} 0 0 ${sweep} ${r[0]} ${-r[0]}` +
      `l ${boxSize - r[0] - r[1]} 0` +
      `a ${arc * r[1]} ${arc * r[1]} 0 0 ${sweep} ${r[1]} ${r[1]}` +
      `l 0 ${boxSize - r[1] - r[2]}` +
      `a ${arc * r[2]} ${arc * r[2]} 0 0 ${sweep} ${-r[2]} ${r[2]}` +
      `l ${-(boxSize - r[2] - r[3])} 0` +
      `a ${arc * r[3]} ${arc * r[3]} 0 0 ${sweep} ${-r[3]} ${-r[3]}` +
      `Z`
    );
  } else {
    let p = '';
    const sr = 0.5;
    const arc = 0.9;
    const sweep = 1;
    if (context[3] && context[1]) {
      p += `M ${x} ${y + sr}` +
        `a ${arc * sr} ${arc * sr} 0 0 ${sweep} ${sr} ${-sr}` +
        `l ${-sr} 0 Z`
    }
    if (context[5] && context[1]) {
      p += `M ${x + boxSize - sr} ${y}` +
        `a ${arc * sr} ${arc * sr} 0 0 ${sweep} ${sr} ${sr}` +
        `l 0 ${-sr} Z`
    }
    if (context[5] && context[7]) {
      p += `M ${x + boxSize} ${y + boxSize - sr}` +
        `a ${arc * sr} ${arc * sr} 0 0 ${sweep} ${-sr} ${sr}` +
        `l ${sr} 0 Z`
    }
    if (context[3] && context[7]) {
      p += `M ${x + sr} ${y + boxSize}` +
        `a ${arc * sr} ${arc * sr} 0 0 ${sweep} ${-sr} ${-sr}` +
        `l 0 ${sr} Z`
    }

    return p;
  }
}

export const moduleStyles = {
  tiles: { radius: 0, margin: 0 },
  tiles_s: { radius: 0, margin: 0.1 },
  tiles_xs: { radius: 0, margin: 0.2 },
  rtiles_xs: { radius: 0.25, margin: 0.2 },
  rtiles_s: { radius: 0.25, margin: 0.1 },
  rtiles: { radius: 0.25, margin: 0 },
  liquid,
  dots: { radius: 0.5, margin: 0 },
  dots_s: { radius: 0.5, margin: 0.1 },
  dots_xs: { radius: 0.5, margin: 0.2 },
  eyes_0: { radius: [0.5, 0, 0.5, 0], margin: 0.1 },
  eyes_90: { radius: [0, 0.5, 0, 0.5], margin: 0.1 },
  drops_0: { radius: [0.5, 0.5, 0.5, 0], margin: 0.1 },
  drops_90: { radius: [0, 0.5, 0.5, 0.5], margin: 0.1 },
  drops_180: { radius: [0.5, 0, 0.5, 0.5], margin: 0.1 },
  drops_270: { radius: [0.5, 0.5, 0, 0.5], margin: 0.1 },
  crosses_a: {
    radius: [0.25, 0.25, 0.25, 0.25],
    sweep: 0,
    margin: 0,
  },
  stars_a: {
    radius: [0.5, 0.5, 0.5, 0.5],
    arc: 4,
    sweep: 0,
    margin: 0,
  },
  stars_b: {
    radius: [0.5, 0.5, 0.5, 0.5],
    arc: 1,
    sweep: 0,
    margin: -0.3 /* bigger for easier scanning */,
  },
  quatrefoils_a: {
    radius: [0.5, 0.5, 0.5, 0.5],
    arc: 0.1,
    sweep: 1,
    margin: 0.1,
  },
  hearts_a: {
    radius: [0.5, 0.5, 0.5, 0.5],
    arc: [0.5, 0.5, 1000, 1000],
    sweep: [1, 1, 0, 0],
    margin: 0.1,
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
    w2: 0.8,
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
