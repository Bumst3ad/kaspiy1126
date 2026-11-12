import { describe, it, expect } from 'vitest';
import { calculateUnderkeelClearance, predictChannelDepth } from './underkeelClearance';

describe('Underkeel Clearance & Channel Hydro Heuristic', () => {
  it('calculates safe underkeel clearance with adequate depth', () => {
    const res = calculateUnderkeelClearance(4.5, 3.8, 0.3);
    expect(res.actualClearanceMeters).toBe(0.7);
    expect(res.netSafetyClearanceMeters).toBe(0.4);
    expect(res.isAgroundRisk).toBe(false);
    expect(res.status).toBe('safe');
  });

  it('detects critical aground risk when vessel draft exceeds depth', () => {
    const res = calculateUnderkeelClearance(3.85, 4.25, 0.3);
    expect(res.actualClearanceMeters).toBe(-0.4);
    expect(res.isAgroundRisk).toBe(true);
    expect(res.status).toBe('critical');
  });

  it('detects warning status when clearance is below safety margin', () => {
    const res = calculateUnderkeelClearance(4.4, 4.25, 0.3);
    expect(res.actualClearanceMeters).toBe(0.15);
    expect(res.netSafetyClearanceMeters).toBe(-0.15);
    expect(res.isAgroundRisk).toBe(true);
    expect(res.status).toBe('warning');
  });

  it('predicts depth drop during strong northeast sgon wind', () => {
    const forecast = predictChannelDepth(15.0, 45, 4.5);
    expect(forecast.isSgonWind).toBe(true);
    expect(forecast.depthDropMeters).toBeGreaterThan(0.3);
    expect(forecast.predictedDepthMeters).toBeLessThan(4.2);
    expect(forecast.uncertaintyIntervalMeters[0]).toBeLessThan(forecast.predictedDepthMeters);
  });

  it('predicts no depth drop for calm non-sgon wind', () => {
    const forecast = predictChannelDepth(4.0, 180, 4.5);
    expect(forecast.isSgonWind).toBe(false);
    expect(forecast.depthDropMeters).toBe(0);
    expect(forecast.predictedDepthMeters).toBe(4.5);
  });
});
