import { describe, it, expect } from 'vitest';
import { calculateRouteEmissions, calculateSegmentCo2Tons } from './emissions';

describe('Emissions Domain Model (GLEC / ISO 14083)', () => {
  it('strictly satisfies savings = road - (sea + rail) without discrepancies', () => {
    const baseline = calculateRouteEmissions(4360, 'baseline');
    // 1221.9 - 198.6 = 1023.3
    expect(baseline.roadCo2Tons).toBe(1221.9);
    expect(baseline.multimodalCo2Tons).toBe(198.6);
    expect(baseline.savingsCo2Tons).toBe(1023.3);
    expect(baseline.savingsPercent).toBe(83.7);
    expect(Number((baseline.roadCo2Tons - baseline.multimodalCo2Tons).toFixed(1))).toBe(baseline.savingsCo2Tons);

    const syncSlot = calculateRouteEmissions(4360, 'makhachkala');
    // 1221.9 - 226.1 = 995.8
    expect(syncSlot.roadCo2Tons).toBe(1221.9);
    expect(syncSlot.multimodalCo2Tons).toBe(226.1);
    expect(syncSlot.savingsCo2Tons).toBe(995.8);
    expect(syncSlot.savingsPercent).toBe(81.5);
    expect(Number((syncSlot.roadCo2Tons - syncSlot.multimodalCo2Tons).toFixed(1))).toBe(syncSlot.savingsCo2Tons);
  });

  it('calculates segment emissions with high precision', () => {
    const railEmissions = calculateSegmentCo2Tons(1000, 'rail', 100);
    expect(railEmissions).toBe(2.2); // 1000 * 100 * 22 / 1_000_000 = 2.2 tons
  });
});
