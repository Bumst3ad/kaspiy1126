import { describe, it, expect } from 'vitest';
import { calculateSegmentCo2, compareRouteEsg } from './esgCalculator';

describe('ESG Carbon Footprint Calculator (GLEC / ISO 14083)', () => {
  it('correctly calculates segment CO2 emissions for rail and sea', () => {
    // 1000 тонн на 100 км по морю при 18 г/т·км = 1800 кг CO2
    const seaCo2 = calculateSegmentCo2(1000, 'sea', 100);
    expect(seaCo2).toBe(1800);

    // 1000 тонн на 100 км по ж/д при 22 г/т·км = 2200 кг CO2
    const railCo2 = calculateSegmentCo2(1000, 'rail', 100);
    expect(railCo2).toBe(2200);

    // 1000 тонн на 100 км на авто при 95 г/т·км = 9500 кг CO2
    const roadCo2 = calculateSegmentCo2(1000, 'road', 100);
    expect(roadCo2).toBe(9500);
  });

  it('demonstrates significant CO2 savings for multimodal transit vs all-road transit', () => {
    const esg = compareRouteEsg(4000);
    expect(esg.roadAlternativeCo2Kg).toBeGreaterThan(esg.syncSlotCo2Kg);
    expect(esg.savingsPercent).toBeGreaterThan(50);
    expect(esg.savingsVsRoadTons).toBeGreaterThan(500);
  });
});
