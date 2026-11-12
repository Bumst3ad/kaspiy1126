import { describe, it, expect } from 'vitest';
import { calculateSlotTimeline } from './slotSync';

describe('Slot Synchronization Timeline Engine (RZD ⇄ Port ⇄ Vessel)', () => {
  it('detects tripartite timeline conflict during sgon crisis without sync', () => {
    const timeline = calculateSlotTimeline(true, false);
    expect(timeline.hasConflict).toBe(true);
    expect(timeline.isSynced).toBe(false);
    expect(timeline.vesselTrack[0].status).toBe('conflict');
    expect(timeline.portTrack[0].status).toBe('conflict');
    expect(timeline.railTrack[0].status).toBe('conflict');
    expect(timeline.statusSummary).toContain('КОНФЛИКТ');
  });

  it('generates seamless aligned timeline when sync-slot is activated', () => {
    const timeline = calculateSlotTimeline(true, true);
    expect(timeline.hasConflict).toBe(false);
    expect(timeline.isSynced).toBe(true);
    expect(timeline.vesselTrack[0].status).toBe('ok');
    expect(timeline.portTrack[0].status).toBe('ok');
    expect(timeline.railTrack[0].status).toBe('ok');
    expect(timeline.portBufferHours).toBeGreaterThan(0);
    expect(timeline.railBufferHours).toBeGreaterThan(0);
  });

  it('provides normal aligned flow when nominal conditions prevail', () => {
    const timeline = calculateSlotTimeline(false, false);
    expect(timeline.hasConflict).toBe(false);
    expect(timeline.isSynced).toBe(false);
  });
});
