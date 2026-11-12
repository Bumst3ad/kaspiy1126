import { describe, it, expect } from 'vitest';
import { evaluateDecisionScenarios } from './scenarioDecision';

describe('Decision Matrix & Feasibility Evaluation', () => {
  it('TEST CASE 1 (Типичная осадка 3.40 м): судно проходит свободно, вмешательства не требуется', () => {
    // Осадка 3.40 м при глубине 3.55 м на баре в пик сгона
    const scenarios = evaluateDecisionScenarios(3.40, 3.55, 20, 54);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].id).toBe('pass');
    expect(scenarios[0].isRecommended).toBe(true);
    expect(scenarios[0].isFeasible).toBe(true);
    expect(scenarios[0].deltaHours).toBe(0);
    expect(scenarios[0].deltaCostUsd).toBe(0);
  });

  it('TEST CASE 2 (Осадка 4.15 м в пик сгона ETA T+20ч): ожидание 36ч -> рекомендован Caspian Sync-Slot (Махачкала)', () => {
    // Осадка 4.15 м при глубине 3.55 м, ETA на баре T+20ч (окно до 54ч)
    const scenarios = evaluateDecisionScenarios(4.15, 3.55, 20, 54);
    expect(scenarios).toHaveLength(3);

    const recommended = scenarios.find((s) => s.isRecommended);
    expect(recommended).toBeDefined();
    expect(recommended?.id).toBe('makhachkala');
    expect(recommended?.isFeasible).toBe(true);
    expect(recommended?.deltaHours).toBe(10.1);
    expect(recommended?.deltaCostUsd).toBe(16400);

    const wait = scenarios.find((s) => s.id === 'wait');
    expect(wait?.isRecommended).toBe(false);
    expect(wait?.isFeasible).toBe(false);
    expect(wait?.rejectionReason).toContain('Ожидание 36 ч');
  });

  it('TEST CASE 3 (Осадка 4.15 м при подходе в хвост шторма ETA T+58ч): ожидание 1.5ч -> рекомендовано ЖДАТЬ НА РЕЙДЕ', () => {
    // Осадка 4.15 м при глубине 4.10 м на баре, подход T+58ч (шторм уже спал)
    const scenarios = evaluateDecisionScenarios(4.15, 4.10, 58, 54);
    expect(scenarios).toHaveLength(3);

    const recommended = scenarios.find((s) => s.isRecommended);
    expect(recommended).toBeDefined();
    expect(recommended?.id).toBe('wait');
    expect(recommended?.isFeasible).toBe(true);
    expect(recommended?.deltaHours).toBe(1.5);
    expect(recommended?.deltaCostUsd).toBeLessThan(5000);

    const makhachkala = scenarios.find((s) => s.id === 'makhachkala');
    expect(makhachkala?.isRecommended).toBe(false);
    expect(makhachkala?.subtitle).toContain('Менее выгодно');
  });
});
