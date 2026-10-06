import { Unit } from '@make-me-menu/shared';

/**
 * Normalizes an amount and unit to the system's base unit.
 * GRAM is the base for weight.
 * MILLILITER is the base for volume.
 * PIECE is the base for pieces.
 */
export function normalizeUnit(amount: number, unit: Unit): { amount: number; unit: Unit } {
  switch (unit) {
    case Unit.KILOGRAM:
      return { amount: amount * 1000, unit: Unit.GRAM };
    case Unit.LITER:
      return { amount: amount * 1000, unit: Unit.MILLILITER };
    case Unit.GRAM:
    case Unit.MILLILITER:
    case Unit.PIECE:
    default:
      return { amount, unit };
  }
}

/**
 * Formats a normalized amount and base unit for display.
 * E.g., 1500 GRAM -> 1.5 кг
 */
export function formatUnitForDisplay(amount: number, unit: Unit): string {
  switch (unit) {
    case Unit.GRAM:
      if (amount >= 1000) {
        return `${Number((amount / 1000).toFixed(2))} кг`;
      }
      return `${Number(amount.toFixed(0))} гр`;
    case Unit.MILLILITER:
      if (amount >= 1000) {
        return `${Number((amount / 1000).toFixed(2))} л`;
      }
      return `${Number(amount.toFixed(0))} мл`;
    case Unit.PIECE:
      return `${Number(amount.toFixed(1))} шт`;
    case Unit.TEASPOON:
      return `${Number(amount.toFixed(1))} ч.л.`;
    case Unit.TABLESPOON:
      return `${Number(amount.toFixed(1))} ст.л.`;
    case Unit.CUP:
      return `${Number(amount.toFixed(1))} чашка`;
    default:
      return `${amount} ${unit}`;
  }
}
