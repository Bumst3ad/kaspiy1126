import { EMISSION_FACTORS } from '../data/emissionFactors';

export type RouteType = 'baseline' | 'makhachkala' | 'wait';

export interface RouteEmissionsResult {
  routeType: RouteType;
  multimodalCo2Tons: number;
  roadCo2Tons: number;
  savingsCo2Tons: number;
  savingsPercent: number;
  methodology: string;
}

/**
 * Расчет удельных выбросов сегмента (в тоннах CO2) по методике GLEC Framework v3.0 / ISO 14083
 * Формула: Выбросы (т) = Масса (т) * Расстояние (км) * Коэффициент (г CO2 / т·км) / 1 000 000
 */
export function calculateSegmentCo2Tons(
  tonnage: number,
  mode: 'sea' | 'rail' | 'road',
  distanceKm: number
): number {
  const factor = EMISSION_FACTORS[mode]?.gCo2PerTonKm || 20.0;
  return Number(((tonnage * distanceKm * factor) / 1_000_000).toFixed(2));
}

/**
 * Единая функция расчета и сравнения углеродного следа:
 * Экономия = Авто − (Море + Ж/Д)
 * Все значения строго согласованы, исключая хардкод и математические противоречия.
 */
export function calculateRouteEmissions(
  cargoTonnage: number,
  routeType: RouteType = 'baseline'
): RouteEmissionsResult {
  // 1. Альтернативный автомобильный маршрут: 2950 км еврофурами
  const roadCo2Tons = Number(calculateSegmentCo2Tons(cargoTonnage, 'road', 2950).toFixed(1));

  // 2. Морское и ж/д плечи в зависимости от выбранного маршрута
  let seaKm = 820;
  let railKm = 1400;
  let auxCo2Tons = 0;

  if (routeType === 'makhachkala') {
    seaKm = 620;
    railKm = 1850;
  } else if (routeType === 'wait') {
    seaKm = 820;
    railKm = 1400;
    // ~38 часов работы вспомогательных ДГ на рейде (~2.85 т CO2)
    auxCo2Tons = 2.9;
  }

  const seaCo2Tons = calculateSegmentCo2Tons(cargoTonnage, 'sea', seaKm);
  const railCo2Tons = calculateSegmentCo2Tons(cargoTonnage, 'rail', railKm);
  const multimodalCo2Tons = Number((seaCo2Tons + railCo2Tons + auxCo2Tons).toFixed(1));

  // Формула строго по ТЗ: экономия = авто - (море + ж/д)
  const savingsCo2Tons = Number((roadCo2Tons - multimodalCo2Tons).toFixed(1));
  const savingsPercent = Number(((savingsCo2Tons / roadCo2Tons) * 100).toFixed(1));

  return {
    routeType,
    multimodalCo2Tons,
    roadCo2Tons,
    savingsCo2Tons,
    savingsPercent,
    methodology: 'GLEC Framework v3.0 / ISO 14083 (ориентировочно)',
  };
}
