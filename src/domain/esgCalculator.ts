import { EMISSION_FACTORS } from '../data/emissionFactors';
import { calculateRouteEmissions } from './emissions';

export { calculateRouteEmissions, type RouteType, type RouteEmissionsResult } from './emissions';

export interface RouteSegment {
  mode: 'sea' | 'rail' | 'road';
  distanceKm: number;
}

export interface EsgComparisonResult {
  multimodalCo2Kg: number;
  roadAlternativeCo2Kg: number;
  syncSlotCo2Kg: number;
  savingsVsRoadKg: number;
  savingsVsRoadTons: number;
  savingsPercent: number;
  methodology: string;
}

export function calculateSegmentCo2(tonnage: number, mode: 'sea' | 'rail' | 'road', distanceKm: number): number {
  const factor = EMISSION_FACTORS[mode]?.gCo2PerTonKm || 20.0;
  return Number(((tonnage * distanceKm * factor) / 1000).toFixed(1));
}

export function compareRouteEsg(cargoTonnage: number, isSlotSynced = false): EsgComparisonResult {
  const baseline = calculateRouteEmissions(cargoTonnage, 'baseline');
  const sync = calculateRouteEmissions(cargoTonnage, 'makhachkala');

  const active = isSlotSynced ? sync : baseline;

  return {
    multimodalCo2Kg: Math.round(active.multimodalCo2Tons * 1000),
    roadAlternativeCo2Kg: Math.round(active.roadCo2Tons * 1000),
    syncSlotCo2Kg: Math.round(sync.multimodalCo2Tons * 1000),
    savingsVsRoadKg: Math.round(active.savingsCo2Tons * 1000),
    savingsVsRoadTons: active.savingsCo2Tons,
    savingsPercent: active.savingsPercent,
    methodology: 'GLEC Framework v3.0 / ISO 14083 (ориентировочно)',
  };
}
