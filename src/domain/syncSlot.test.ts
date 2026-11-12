import { describe, it, expect } from 'vitest';
import { evaluateTripartiteSyncSlot } from './syncSlot';

describe('Tripartite Sync-Slot Evaluator', () => {
  it('returns not_needed when vessel is on time with no aground risk', () => {
    const plan = evaluateTripartiteSyncSlot(false, 0.5);
    expect(plan.status).toBe('not_needed');
    expect(plan.delayHoursSaved).toBe(0);
    expect(plan.demurrageSavedUsd).toBe(0);
  });

  it('generates recommended tripartite plan when aground risk is detected', () => {
    const plan = evaluateTripartiteSyncSlot(true, 72.0);
    expect(plan.status).toBe('recommended');
    expect(plan.targetPortId).toBe('RU_MCX');
    expect(plan.targetDepthMeters).toBe(6.8);
    expect(plan.delayHoursSaved).toBe(70.5);
    expect(plan.demurrageSavedUsd).toBeGreaterThan(40000);
    expect(plan.rzdDestinationStation).toBe('ст. Махачкала-Порт');
  });
});
