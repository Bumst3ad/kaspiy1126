import { describe, it, expect } from 'vitest';
import { generateHydroTimeline, getInterpolatedHydroPoint } from './hydroProfile';

describe('Hydro Profile & Predictive Timeline', () => {
  it('generates 72-hour timeline with detected risk window during sgon wind', () => {
    const profile = generateHydroTimeline(4.15, true);
    expect(profile.timeline.length).toBeGreaterThan(10);
    expect(profile.minDepthMeters).toBeLessThanOrEqual(3.55);
    expect(profile.riskWindow.hasRisk).toBe(true);
    expect(profile.riskWindow.startHour).toBeLessThanOrEqual(21);
    expect(profile.riskWindow.endHour).toBeGreaterThanOrEqual(24);
  });

  it('interpolates point at exact hour correctly', () => {
    const profile = generateHydroTimeline(4.15, true);
    const pointAtT24 = getInterpolatedHydroPoint(profile, 24);
    expect(pointAtT24.hour).toBe(24);
    expect(pointAtT24.depthMeters).toBe(3.55);
    expect(pointAtT24.clearanceMeters).toBe(-0.6);
    expect(pointAtT24.isRisk).toBe(true);
  });

  it('calculates calm baseline when crisis mode is disabled', () => {
    const profile = generateHydroTimeline(4.15, false);
    const pointAtT24 = getInterpolatedHydroPoint(profile, 24);
    expect(pointAtT24.depthMeters).toBe(4.4);
    expect(pointAtT24.clearanceMeters).toBe(0.25);
    expect(pointAtT24.isRisk).toBe(false);
  });
});
