import { describe, it, expect } from 'vitest';
import { calculateWeights, weightedRandomSelect } from '../../src/domain/historyWeighter';

describe('historyWeighter', () => {
  const currentDateStr = '2026-10-05T00:00:00.000Z'; // Monday

  const dishes = [
    { id: 1, lastCookedAt: null }, // Never cooked
    { id: 2, lastCookedAt: '2026-10-04T00:00:00.000Z' }, // 1 day ago
    { id: 3, lastCookedAt: '2026-10-01T00:00:00.000Z' }, // 4 days ago
    { id: 4, lastCookedAt: '2026-09-01T00:00:00.000Z' }, // >30 days ago
  ];

  describe('calculateWeights', () => {
    it('should assign max weight to never cooked dishes', () => {
      const weights = calculateWeights(dishes, currentDateStr);
      const neverCooked = weights.find(w => w.dish.id === 1);
      expect(neverCooked?.weight).toBe(10); // MAX_WEIGHT
    });

    it('should calculate weight based on days since last cooked', () => {
      const weights = calculateWeights(dishes, currentDateStr);
      const oneDayAgo = weights.find(w => w.dish.id === 2);
      const fourDaysAgo = weights.find(w => w.dish.id === 3);
      
      // Base (1) + 1 day * 0.5 = 1.5
      expect(oneDayAgo?.weight).toBe(1.5);
      
      // Base (1) + 4 days * 0.5 = 3
      expect(fourDaysAgo?.weight).toBe(3);
    });

    it('should cap the weight at MAX_WEIGHT (10)', () => {
      const weights = calculateWeights(dishes, currentDateStr);
      const longAgo = weights.find(w => w.dish.id === 4);
      
      // Base (1) + ~34 days * 0.5 = 18. capped to 10.
      expect(longAgo?.weight).toBe(10);
    });
  });

  describe('weightedRandomSelect', () => {
    const weightedDishes = [
      { dish: { id: 1, lastCookedAt: null }, weight: 2 },
      { dish: { id: 2, lastCookedAt: null }, weight: 8 },
    ];

    it('should select based on random value injection deterministically', () => {
      // Total weight = 10.
      // id: 1 takes range [0, 2)
      // id: 2 takes range [2, 10)
      
      expect(weightedRandomSelect(weightedDishes, 0.1)?.id).toBe(1); // 0.1 * 10 = 1 < 2 -> id 1
      expect(weightedRandomSelect(weightedDishes, 0.19)?.id).toBe(1); // 0.19 * 10 = 1.9 < 2 -> id 1
      
      expect(weightedRandomSelect(weightedDishes, 0.21)?.id).toBe(2); // 0.21 * 10 = 2.1 >= 2 -> id 2
      expect(weightedRandomSelect(weightedDishes, 0.9)?.id).toBe(2);
    });

    it('should handle empty lists gracefully', () => {
      expect(weightedRandomSelect([], 0.5)).toBeNull();
    });
  });
});
