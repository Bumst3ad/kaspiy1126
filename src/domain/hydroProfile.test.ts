import { describe, it, expect } from 'vitest';
import {
  generateHydroTimeline,
  getInterpolatedHydroPoint,
  calculateGroundingProbability,
  standardNormalCdf,
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

  it('calculates grounding probability using normal approximation from P10-P90', () => {
    // When median = 3.55m, P10 = 3.40m, P90 = 3.70m, sigma = 0.30/2.563 = 0.117m
    // For draft 3.56m (1 cm deeper than median): Z = 0.01 / 0.117 = 0.085 -> ~53-57%
    const prob = calculateGroundingProbability(3.40, 3.70, 3.57, 3.55);
    expect(Math.round(prob * 100)).toBe(57);

    // Deep water (draft 3.0m vs depth 4.5m): ~0%
    const safeProb = calculateGroundingProbability(4.35, 4.65, 3.0, 4.50);
    expect(Math.round(safeProb * 100)).toBe(0);

    // Extreme deficit (draft 4.15m vs depth 3.55m): >99%
    const crisisProb = calculateGroundingProbability(3.40, 3.70, 4.15, 3.55);
    expect(Math.round(crisisProb * 100)).toBe(100);
  });
});
