/**
 * Unit conversion and formatting for temperature and weight.
 * Storage is always lbs and °F; we convert for display based on user settings.
 */

export type TempUnit = 'F' | 'C';
export type WeightUnit = 'lbs' | 'kg';

const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 1 / LBS_TO_KG;

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function lbsToKg(lbs: number): number {
  return lbs * LBS_TO_KG;
}

export function kgToLbs(kg: number): number {
  return kg * KG_TO_LBS;
}

/** Temperature for display (input in Fahrenheit) */
export function tempForDisplay(tempF: number | undefined | null, unit: TempUnit): number | null {
  if (tempF == null || Number.isNaN(tempF)) return null;
  return unit === 'C' ? fahrenheitToCelsius(tempF) : tempF;
}

/** Weight for display (input in pounds) */
export function weightForDisplay(weightLbs: number | undefined | null, unit: WeightUnit): number | null {
  if (weightLbs == null || Number.isNaN(weightLbs)) return null;
  return unit === 'kg' ? lbsToKg(weightLbs) : weightLbs;
}

/** Format temperature with unit symbol */
export function formatTemp(tempF: number | undefined | null, unit: TempUnit): string {
  const v = tempForDisplay(tempF, unit);
  if (v == null) return '--';
  const dec = unit === 'C' ? 1 : 1;
  return `${v.toFixed(dec)}°${unit}`;
}

/** Format weight with unit symbol */
export function formatWeight(weightLbs: number | undefined | null, unit: WeightUnit): string {
  const v = weightForDisplay(weightLbs, unit);
  if (v == null) return '--';
  return `${v.toFixed(1)} ${unit}`;
}

/** Temperature unit label */
export function tempUnitLabel(unit: TempUnit): string {
  return unit === 'C' ? '°C' : '°F';
}

/** Weight unit label */
export function weightUnitLabel(unit: WeightUnit): string {
  return unit === 'lbs' ? 'lbs' : 'kg';
}

/** Normal temp range for display (min/max in °F) */
export const NORMAL_TEMP_F = { min: 100, max: 102.5 };
export const NORMAL_TEMP_C = {
  min: fahrenheitToCelsius(100),
  max: fahrenheitToCelsius(102.5),
};

export function normalTempRange(unit: TempUnit): { min: number; max: number } {
  return unit === 'C' ? NORMAL_TEMP_C : NORMAL_TEMP_F;
}

/** Format normal range string for subtitles */
export function formatNormalTempRange(unit: TempUnit): string {
  const r = normalTempRange(unit);
  const suffix = unit === 'C' ? '°C' : '°F';
  return `Normal: ${r.min.toFixed(1)}-${r.max.toFixed(1)}${suffix}`;
}
