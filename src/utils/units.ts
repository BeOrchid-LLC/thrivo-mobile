import type { UnitSystem } from "@/contracts";

/** Unit conversions for weight entry/display (lb↔kg). Storage is always kg. */
const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const ML_PER_FL_OZ = 29.5735295625;

export const lbToKg = (lb: number): number => lb * KG_PER_LB;

export const kgToLb = (kg: number): number => kg / KG_PER_LB;

export const cmToIn = (cm: number): number => cm / CM_PER_IN;

export const inToCm = (inch: number): number => inch * CM_PER_IN;

export const mlToFlOz = (ml: number): number => ml / ML_PER_FL_OZ;

export const flOzToMl = (oz: number): number => oz * ML_PER_FL_OZ;

/** Round to `decimals` places (default 1) for display. */
export const roundTo = (value: number, decimals = 1): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const weightUnitFor = (unitSystem: UnitSystem | undefined): "kg" | "lbs" =>
  unitSystem === "imperial" ? "lbs" : "kg";

export const heightUnitFor = (unitSystem: UnitSystem | undefined): "in" | "cm" =>
  unitSystem === "imperial" ? "in" : "cm";

export const waterUnitFor = (unitSystem: UnitSystem | undefined): "fl oz" | "ml" =>
  unitSystem === "imperial" ? "fl oz" : "ml";

export function weightFromKg(kg: number, unitSystem: UnitSystem | undefined): number {
  return unitSystem === "imperial" ? kgToLb(kg) : kg;
}

export function weightToKg(weight: number, unitSystem: UnitSystem | undefined): number {
  return unitSystem === "imperial" ? lbToKg(weight) : weight;
}

export function heightFromCm(cm: number, unitSystem: UnitSystem | undefined): number {
  return unitSystem === "imperial" ? cmToIn(cm) : cm;
}

export function heightToCm(height: number, unitSystem: UnitSystem | undefined): number {
  return unitSystem === "imperial" ? inToCm(height) : height;
}

export function waterFromMl(ml: number, unitSystem: UnitSystem | undefined): number {
  return unitSystem === "imperial" ? mlToFlOz(ml) : ml;
}

export function waterToMl(amount: number, unitSystem: UnitSystem | undefined): number {
  return unitSystem === "imperial" ? flOzToMl(amount) : amount;
}

export function formatWeight(
  kg: number | null | undefined,
  unitSystem: UnitSystem | undefined,
  options: { signed?: boolean; absolute?: boolean; fallback?: string } = {}
): string {
  const unit = weightUnitFor(unitSystem);
  if (kg === null || kg === undefined) return options.fallback ?? `-- ${unit}`;

  const source = options.absolute ? Math.abs(kg) : kg;
  const value = roundTo(weightFromKg(source, unitSystem), 1);
  const sign = options.signed && value > 0 ? "+" : "";
  return `${sign}${value} ${unit}`;
}

export function formatHeight(
  cm: number | string | null | undefined,
  unitSystem: UnitSystem | undefined
): string {
  if (cm === null || cm === undefined || cm === "") return "";
  const numeric = typeof cm === "string" ? Number.parseFloat(cm) : cm;
  if (!Number.isFinite(numeric)) return "";
  const unit = heightUnitFor(unitSystem);
  return `${roundTo(heightFromCm(numeric, unitSystem), 1)} ${unit}`;
}

export function formatWater(ml: number | null | undefined, unitSystem: UnitSystem | undefined) {
  const unit = waterUnitFor(unitSystem);
  if (ml === null || ml === undefined) return `-- ${unit}`;
  const decimals = unitSystem === "imperial" ? 1 : 0;
  return `${roundTo(waterFromMl(ml, unitSystem), decimals).toLocaleString()} ${unit}`;
}
