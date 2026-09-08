export const lerpChannel = (start: number, end: number, t: number) =>
  Math.round(start + (end - start) * t);

export const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

export const mixHex = (start: string, end: string, t: number) => {
  const s = hexToRgb(start);
  const e = hexToRgb(end);
  return {
    r: lerpChannel(s.r, e.r, t),
    g: lerpChannel(s.g, e.g, t),
    b: lerpChannel(s.b, e.b, t),
  };
};
