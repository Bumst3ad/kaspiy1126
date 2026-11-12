import { EMISSION_FACTORS } from '../data/emissionFactors';

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

/**
 * Расчет углеродного следа перевозки по методике GLEC Framework v3.0 / ISO 14083
 * Формула: Выбросы = Масса (т) * Расстояние (км) * Коэффициент (г CO2 / т·км) / 1000
 */
export function calculateSegmentCo2(tonnage: number, mode: 'sea' | 'rail' | 'road', distanceKm: number): number {
  const factor = EMISSION_FACTORS[mode]?.gCo2PerTonKm || 20.0;
  return Number(((tonnage * distanceKm * factor) / 1000).toFixed(1));
}

export function compareRouteEsg(cargoTonnage: number): EsgComparisonResult {
  // 1. Базовый морской транзитный маршрут через Астрахань: Ж/Д 1400 км + Море 820 км
  const baselineRailCo2 = calculateSegmentCo2(cargoTonnage, 'rail', 1400);
  const baselineSeaCo2 = calculateSegmentCo2(cargoTonnage, 'sea', 820);
  const multimodalCo2Kg = baselineRailCo2 + baselineSeaCo2;

  // 2. Альтернативный полностью автомобильный маршрут: Фуры 2950 км
  const roadAlternativeCo2Kg = calculateSegmentCo2(cargoTonnage, 'road', 2950);

  // 3. Маршрут Caspian Sync-Slot через Махачкалу: Ж/Д 1850 км + Море 620 км
  const syncRailCo2 = calculateSegmentCo2(cargoTonnage, 'rail', 1850);
  const syncSeaCo2 = calculateSegmentCo2(cargoTonnage, 'sea', 620);
  const syncSlotCo2Kg = syncRailCo2 + syncSeaCo2;

  const savingsVsRoadKg = Number((roadAlternativeCo2Kg - syncSlotCo2Kg).toFixed(1));
  const savingsVsRoadTons = Number((savingsVsRoadKg / 1000).toFixed(2));
  const savingsPercent = Number(((savingsVsRoadKg / roadAlternativeCo2Kg) * 100).toFixed(1));

  return {
    multimodalCo2Kg,
    roadAlternativeCo2Kg,
    syncSlotCo2Kg,
    savingsVsRoadKg,
    savingsVsRoadTons,
    savingsPercent,
    methodology: 'GLEC Framework v3.0 / ISO 14083 (ориентировочно)',
  };
}
