import { describe, it, expect } from 'vitest';
import { evaluateDecisionScenarios } from './scenarioDecision';

describe('Decision Matrix & Feasibility Evaluation', () => {
  it('evaluates all 3 alternative scenarios with delta metrics', () => {
    const scenarios = evaluateDecisionScenarios(4.15, 3.55);
    expect(scenarios).toHaveLength(3);

    const [wait, makhachkala, lighten] = scenarios;

    // Check Wait scenario
    expect(wait.id).toBe('wait');
    expect(wait.deltaHours).toBe(72.0);
    expect(wait.deltaCostUsd).toBe(45000);
    expect(wait.isFeasible).toBe(false);
    expect(wait.rejectionReason).toContain('Аннулирование');

    // Check Makhachkala scenario (Recommended)
    expect(makhachkala.id).toBe('makhachkala');
    expect(makhachkala.deltaHours).toBe(1.5);
    expect(makhachkala.isFeasible).toBe(true);
    expect(makhachkala.isRecommended).toBe(true);
    expect(makhachkala.feasibility.draft).toBe(true);
    expect(makhachkala.feasibility.berthAndCrane).toBe(true);
    expect(makhachkala.feasibility.rzdSlot).toBe(true);
    expect(makhachkala.feasibility.locomotive).toBe(true);

    // Check Lighten scenario
    expect(lighten.id).toBe('lighten');
    expect(lighten.deltaHours).toBe(28.0);
    expect(lighten.isFeasible).toBe(false);
    expect(lighten.rejectionReason).toBeDefined();
  });
});
