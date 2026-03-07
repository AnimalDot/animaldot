import type { TempUnit, WeightUnit } from './store/useAppStore';

/** Convert °F to °C */
export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * (5 / 9);
}

/** Convert °C to °F */
export function celsiusToFahrenheit(c: number): number {
  return c * (9 / 5) + 32;
}

/** Display temperature in selected unit (input always in °F) */
export function tempForDisplay(tempF: number, unit: TempUnit): number {
  return unit === 'C' ? fahrenheitToCelsius(tempF) : tempF;
}

/** Display weight in selected unit (input always in lbs) */
export function weightForDisplay(lbs: number, unit: WeightUnit): number {
  return unit === 'kg' ? lbs * 0.45359237 : lbs;
}

export function tempUnitLabel(unit: TempUnit): string {
  return unit === 'C' ? '°C' : '°F';
}

export function weightUnitLabel(unit: WeightUnit): string {
  return unit === 'kg' ? 'kg' : 'lbs';
}

/** Normal temp range for display */
export function normalTempRange(unit: TempUnit): string {
  return unit === 'C' ? 'Normal: 37.8–39.2 °C' : 'Normal: 100–102.5 °F';
}
