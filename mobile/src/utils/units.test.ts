/// <reference types="jest" />
import {
  fahrenheitToCelsius,
  celsiusToFahrenheit,
  lbsToKg,
  kgToLbs,
  tempForDisplay,
  weightForDisplay,
} from './units';

describe('units', () => {
  describe('fahrenheitToCelsius', () => {
    it('converts 32°F to 0°C', () => {
      expect(fahrenheitToCelsius(32)).toBe(0);
    });
    it('converts 212°F to 100°C', () => {
      expect(fahrenheitToCelsius(212)).toBeCloseTo(100);
    });
  });

  describe('celsiusToFahrenheit', () => {
    it('converts 0°C to 32°F', () => {
      expect(celsiusToFahrenheit(0)).toBe(32);
    });
  });

  describe('lbsToKg / kgToLbs', () => {
    it('converts 1 lb to ~0.454 kg', () => {
      expect(lbsToKg(1)).toBeCloseTo(0.453592);
    });
    it('round-trips', () => {
      expect(kgToLbs(lbsToKg(62))).toBeCloseTo(62);
    });
  });

  describe('tempForDisplay', () => {
    it('returns value in F when unit is F', () => {
      expect(tempForDisplay(101.5, 'F')).toBe(101.5);
    });
    it('converts to C when unit is C', () => {
      expect(tempForDisplay(32, 'C')).toBe(0);
    });
    it('returns null for null input', () => {
      expect(tempForDisplay(null, 'F')).toBeNull();
    });
  });

  describe('weightForDisplay', () => {
    it('returns value in lbs when unit is lbs', () => {
      expect(weightForDisplay(62, 'lbs')).toBe(62);
    });
    it('converts to kg when unit is kg', () => {
      expect(weightForDisplay(1, 'kg')).toBeCloseTo(0.453592);
    });
  });
});
