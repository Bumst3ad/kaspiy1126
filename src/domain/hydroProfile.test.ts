import { describe, it, expect } from 'vitest';
import {
  generateHydroTimeline,
  getInterpolatedHydroPoint,
  calculateGroundingProbability,
} from './hydroProfile';

describe('Hydro Profile & Predictive Timeline', () => {
  it('generates 72-hour timeline with detected 39-hour risk window during sgon wind', () => {
    const profile = generateHydroTimeline(4.15, true, 20, 0.35);
    expect(profile.timeline.length).toBeGreaterThan(10);
    expect(profile.minDepthMeters).toBeLessThanOrEqual(3.55);
    expect(profile.riskWindow.hasRisk).toBe(true);
    expect(profile.riskWindow.startHour).toBe(15);
    expect(profile.riskWindow.endHour).toBe(54);
    expect(profile.riskWindow.durationHours).toBe(39);
    // Vessel ETA arrival at T+20h intersects risk window [15..54]
    expect(profile.isEtaInRiskWindow).toBe(true);
    expect(profile.depthAtArrivalMeters).toBe(3.55);
    expect(profile.clearanceAtArrivalMeters).toBe(-0.60);
  });

  it('interpolates point at exact hour correctly', () => {
    const profile = generateHydroTimeline(4.15, true, 20, 0.35);
    const pointAtT24 = getInterpolatedHydroPoint(profile, 24);
    expect(pointAtT24.hour).toBe(24);
    expect(pointAtT24.depthMeters).toBe(3.55);
    expect(pointAtT24.clearanceMeters).toBe(-0.6);
    expect(pointAtT24.isRisk).toBe(true);
  });

  it('calculates calm baseline when crisis mode is disabled', () => {
    const profile = generateHydroTimeline(4.15, false, 20, 0.10);
    const pointAtT20 = getInterpolatedHydroPoint(profile, 20);
    expect(pointAtT20.depthMeters).toBe(4.4);
    expect(pointAtT20.clearanceMeters).toBe(0.25);
    expect(pointAtT20.isRisk).toBe(false);
    expect(profile.isEtaInRiskWindow).toBe(false);
  });

  it('reconstructs June 2026 historical depth of 3.38m with 9.0 m/s wind and 0.55m siltation', () => {
    const profile = generateHydroTimeline(3.40, true, 20, 0.55, true);
    expect(profile.minDepthMeters).toBe(3.38);
    expect(profile.depthAtArrivalMeters).toBe(3.38);
    expect(profile.clearanceAtArrivalMeters).toBe(-0.02);
    expect(profile.isSafePass).toBe(false);
    expect(profile.maxWindSpeedMs).toBe(9.0);
  });

  it('calculates grounding risk probability via P10-P90 normal distribution', () => {
    // Exact user test scenario: draft 4.15m vs depth 4.12m with [4.04..4.20] span -> ~57-60%
    const prob57 = calculateGroundingProbability(4.15, 4.12, 4.04, 4.20);
    expect(prob57).toBeGreaterThanOrEqual(50);
    expect(prob57).toBeLessThanOrEqual(70);

    // Deep calm water: draft 4.15m vs depth 4.80m -> 0%
    const prob0 = calculateGroundingProbability(4.15, 4.80, 4.70, 4.90);
    expect(prob0).toBe(0);

    // Severe aground: draft 4.15m vs depth 3.55m -> 99%
    const prob99 = calculateGroundingProbability(4.15, 3.55, 3.40, 3.70);
    expect(prob99).toBe(99);
  });
});
