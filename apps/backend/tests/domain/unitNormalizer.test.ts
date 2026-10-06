import { describe, it, expect } from 'vitest';
import { Unit } from '@make-me-menu/shared';
import { normalizeUnit, formatUnitForDisplay } from '../../src/domain/unitNormalizer';

describe('unitNormalizer', () => {
  describe('normalizeUnit', () => {
    it('should convert KILOGRAM to GRAM', () => {
      expect(normalizeUnit(1.5, Unit.KILOGRAM)).toEqual({ amount: 1500, unit: Unit.GRAM });
      expect(normalizeUnit(0.5, Unit.KILOGRAM)).toEqual({ amount: 500, unit: Unit.GRAM });
    });

    it('should convert LITER to MILLILITER', () => {
      expect(normalizeUnit(2, Unit.LITER)).toEqual({ amount: 2000, unit: Unit.MILLILITER });
      expect(normalizeUnit(0.25, Unit.LITER)).toEqual({ amount: 250, unit: Unit.MILLILITER });
    });

    it('should leave GRAM, MILLILITER, and PIECE unchanged', () => {
      expect(normalizeUnit(500, Unit.GRAM)).toEqual({ amount: 500, unit: Unit.GRAM });
      expect(normalizeUnit(250, Unit.MILLILITER)).toEqual({ amount: 250, unit: Unit.MILLILITER });
      expect(normalizeUnit(3, Unit.PIECE)).toEqual({ amount: 3, unit: Unit.PIECE });
    });
    
    // Note on incompatible units: normalizeUnit only acts on one unit at a time.
    // The ShoppingListBuilder handles not mixing incompatible units by using the unit as part of the grouping key.
  });

  describe('formatUnitForDisplay', () => {
    it('should format GRAM', () => {
      expect(formatUnitForDisplay(500, Unit.GRAM)).toBe('500 гр');
      expect(formatUnitForDisplay(1000, Unit.GRAM)).toBe('1 кг');
      expect(formatUnitForDisplay(1500, Unit.GRAM)).toBe('1.5 кг');
    });

    it('should format MILLILITER', () => {
      expect(formatUnitForDisplay(250, Unit.MILLILITER)).toBe('250 мл');
      expect(formatUnitForDisplay(1000, Unit.MILLILITER)).toBe('1 л');
      expect(formatUnitForDisplay(2500, Unit.MILLILITER)).toBe('2.5 л');
    });

    it('should format PIECE', () => {
      expect(formatUnitForDisplay(5, Unit.PIECE)).toBe('5 шт');
      expect(formatUnitForDisplay(2.5, Unit.PIECE)).toBe('2.5 шт');
    });
  });
});
