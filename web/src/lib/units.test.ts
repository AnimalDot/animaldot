import { describe, it, expect } from 'vitest';
import {
  fahrenheitToCelsius,
  celsiusToFahrenheit,
  tempForDisplay,
  weightForDisplay,
  tempUnitLabel,
  weightUnitLabel,
  normalTempRange,
} from './units';

describe('units', () => {
  describe('fahrenheitToCelsius', () => {
    it('converts 32°F to 0°C', () => {
      expect(fahrenheitToCelsius(32)).toBe(0);
    });
    it('converts 212°F to 100°C', () => {
      expect(fahrenheitToCelsius(212)).toBeCloseTo(100);
    });
    it('converts 98.6°F to ~37°C', () => {
      expect(fahrenheitToCelsius(98.6)).toBeCloseTo(37, 1);
    });
  });

  describe('celsiusToFahrenheit', () => {
    it('converts 0°C to 32°F', () => {
      expect(celsiusToFahrenheit(0)).toBe(32);
    });
    it('converts 100°C to 212°F', () => {
      expect(celsiusToFahrenheit(100)).toBe(212);
    });
  });

  describe('tempForDisplay', () => {
    it('returns same value in F', () => {
      expect(tempForDisplay(101.5, 'F')).toBe(101.5);
    });
    it('converts to C when unit is C', () => {
      expect(tempForDisplay(32, 'C')).toBe(0);
    });
  });

  describe('weightForDisplay', () => {
    it('returns same value in lbs', () => {
      expect(weightForDisplay(62, 'lbs')).toBe(62);
    });
    it('converts to kg when unit is kg', () => {
      const kg = weightForDisplay(1, 'kg');
      expect(kg).toBeCloseTo(0.45359237);
    });
  });

  describe('tempUnitLabel', () => {
    it('returns °F for F', () => expect(tempUnitLabel('F')).toBe('°F'));
    it('returns °C for C', () => expect(tempUnitLabel('C')).toBe('°C'));
  });

  describe('weightUnitLabel', () => {
    it('returns lbs for lbs', () => expect(weightUnitLabel('lbs')).toBe('lbs'));
    it('returns kg for kg', () => expect(weightUnitLabel('kg')).toBe('kg'));
  });

  describe('normalTempRange', () => {
    it('returns F range for F', () => {
      expect(normalTempRange('F')).toContain('100');
      expect(normalTempRange('F')).toContain('°F');
    });
    it('returns C range for C', () => {
      expect(normalTempRange('C')).toContain('37.8');
      expect(normalTempRange('C')).toContain('°C');
    });
  });
});
