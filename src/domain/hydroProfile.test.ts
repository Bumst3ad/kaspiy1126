import { describe, it, expect } from 'vitest';
import { generateHydroTimeline, getInterpolatedHydroPoint } from './hydroProfile';

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
});
