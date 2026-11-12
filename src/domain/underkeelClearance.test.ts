import { describe, it, expect } from 'vitest';
import { calculateUnderkeelClearance, predictChannelDepth } from './underkeelClearance';

describe('Underkeel Clearance & Channel Hydro Heuristic', () => {
  it('calculates safe underkeel clearance with adequate depth (>= 0.50m)', () => {
    const res = calculateUnderkeelClearance(4.8, 4.15, 0.5);
    expect(res.actualClearanceMeters).toBe(0.65);
    expect(res.netSafetyClearanceMeters).toBe(0.15);
    expect(res.isAgroundRisk).toBe(false);
    expect(res.status).toBe('safe');
  });

  it('detects critical aground risk when vessel draft exceeds depth', () => {
    const res = calculateUnderkeelClearance(3.55, 4.15, 0.5);
    expect(res.actualClearanceMeters).toBe(-0.6);
    expect(res.isAgroundRisk).toBe(true);
    expect(res.status).toBe('critical');
  });

  it('detects warning status when clearance is below safety margin threshold (0.00 .. 0.49m)', () => {
    const res = calculateUnderkeelClearance(4.4, 4.15, 0.5);
    expect(res.actualClearanceMeters).toBe(0.25);
    expect(res.netSafetyClearanceMeters).toBe(-0.25);
    expect(res.status).toBe('warning');
    expect(res.statusLabel).toContain('<0.5 м');
  });

  it('predicts depth drop during strong northwest (NW) sgon wind (315°)', () => {
    const forecast = predictChannelDepth(14.5, 315, 4.15);
    expect(forecast.isSgonWind).toBe(true);
    expect(forecast.windRumb).toBe('СЗ');
    expect(forecast.depthDropMeters).toBeGreaterThan(0.5);
    expect(forecast.predictedDepthMeters).toBeLessThan(3.6);
    expect(forecast.uncertaintyIntervalMeters[0]).toBeLessThan(forecast.predictedDepthMeters);
  });

  it('predicts no depth drop for southeast (SE) nagon wind (135°)', () => {
    const forecast = predictChannelDepth(3.5, 135, 4.15);
    expect(forecast.isSgonWind).toBe(false);
    expect(forecast.windRumb).toBe('ЮВ');
    expect(forecast.depthDropMeters).toBe(0);
    expect(forecast.predictedDepthMeters).toBe(4.15);
  });
});
