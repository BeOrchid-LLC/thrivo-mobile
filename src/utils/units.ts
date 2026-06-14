/** Unit conversions for weight entry/display (lb↔kg). Storage is always kg. */
const KG_PER_LB = 0.45359237;

export const lbToKg = (lb: number): number => lb * KG_PER_LB;

export const kgToLb = (kg: number): number => kg / KG_PER_LB;

/** Round to `decimals` places (default 1) for display. */
export const roundTo = (value: number, decimals = 1): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};
