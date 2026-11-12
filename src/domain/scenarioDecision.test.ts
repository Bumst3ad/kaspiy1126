import { describe, it, expect } from 'vitest';
import { evaluateDecisionScenarios } from './scenarioDecision';

describe('Decision Matrix & Feasibility Evaluation', () => {
  it('evaluates all 3 alternative scenarios with realistic derived formulas and calculations', () => {
    // 39 hours window, arrival at 20h, recovery at 54h
    const scenarios = evaluateDecisionScenarios(4.15, 3.55, 39, 20, 54);
    expect(scenarios).toHaveLength(3);

    const [wait, makhachkala, lighten] = scenarios;

    // Check Wait scenario
    expect(wait.id).toBe('wait');
    // (54 - 20) + 4 = 38.0 h
    expect(wait.deltaHours).toBe(38.0);
    expect(wait.deltaCostUsd).toBe(27110);
    expect(wait.deltaCo2Tons).toBe(4.3);
    expect(wait.isFeasible).toBe(false);
    expect(wait.calculationDetails.timeFormula).toContain('38');

    // Check Makhachkala scenario (Recommended)
    expect(makhachkala.id).toBe('makhachkala');
    // +10.1 h (sea -1.4h + rail +10.0h + slot sync +1.5h)
    expect(makhachkala.deltaHours).toBe(10.1);
    expect(makhachkala.deltaCostUsd).toBe(16400);
    expect(makhachkala.deltaCo2Tons).toBe(38.9);
    expect(makhachkala.isFeasible).toBe(true);
    expect(makhachkala.isRecommended).toBe(true);
    expect(makhachkala.feasibility.draft).toBe(true);
    expect(makhachkala.feasibility.berthAndCrane).toBe(true);
    expect(makhachkala.feasibility.rzdSlot).toBe(true);
    expect(makhachkala.feasibility.locomotive).toBe(true);
    expect(makhachkala.calculationDetails.timeFormula).toContain('10.1');

    // Check Lighten scenario
    expect(lighten.id).toBe('lighten');
    expect(lighten.deltaHours).toBe(22.0);
    expect(lighten.deltaCostUsd).toBe(18500);
    expect(lighten.deltaCo2Tons).toBe(2.1);
    expect(lighten.isFeasible).toBe(false);
    expect(lighten.rejectionReason).toBeDefined();
  });
});
