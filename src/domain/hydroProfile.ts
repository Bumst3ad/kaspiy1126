import { CASPIAN_ASSUMPTIONS } from '../data/assumptions';

export interface HydroTimelinePoint {
  hour: number;
  label: string;
  depthMeters: number;
  vesselDraftMeters: number;
  clearanceMeters: number;
  windSpeedMs: number;
  windRumb: string;
  isRisk: boolean; // Опасность мели (глубина <= осадки)
  isWarning: boolean; // Запас ниже 0.50 м
  vesselLat: number;
  vesselLon: number;
  etaOffsetHours: number;
  demurrageUsd: number;
}

export interface HydroProfileForecast {
  timeline: HydroTimelinePoint[];
  riskWindow: {
    startHour: number;
    endHour: number;
    durationHours: number;
    hasRisk: boolean;
  };
  vesselDraftMeters: number;
  siltationMeters: number;
  vesselEtaBarHour: number; // Плановый час подхода к бару 151-155 км
  isEtaInRiskWindow: boolean; // Попадает ли подход судна в окно риска
  depthAtArrivalMeters: number;
  clearanceAtArrivalMeters: number;
  isSafePass: boolean; // Судно проходит без инцидента
  minDepthMeters: number;
  maxWindSpeedMs: number;
  provenance: 'assumption';
}

/**
 * Расчет 72-часового предиктивного гидрологического профиля ВКМСК (151-155 км).
 *
 * ФИЗИЧЕСКАЯ РЕКОНСТРУКЦИЯ (по материалам Минтранса РФ):
 * Фактическая глубина на баре определяется совокупностью 3 факторов:
 * 1. Проектная паспортная глубина: 4.50 м.
 * 2. Донные наносы после паводка (заносимость перекатов): siltationMeters (0.10 - 0.55 м).
 * 3. Ветровой сгон северных и северо-западных румбов (СЗ >8 м/с выдувает воду из дельты на 0.10 - 0.60 м).
 *
 * Формула: Depth(t) = 4.50 - siltationMeters - windDrop(t)
 */
export function generateHydroTimeline(
  vesselDraftMeters = 4.15,
  isCrisisMode = true,
  vesselEtaBarHour = 20,
  siltationMeters = 0.35 // Допущение на основе данных Минтранса РФ (наносы после весеннего паводка)
): HydroProfileForecast {
  const points: HydroTimelinePoint[] = [];
  const hours = [0, 3, 6, 9, 12, 15, 18, 20, 24, 27, 30, 33, 36, 42, 48, 54, 60, 66, 72];

  const targetDepth = Number(CASPIAN_ASSUMPTIONS.vkmskTargetDepth?.value || 4.50);
  const baseCalmDepth = Number((targetDepth - siltationMeters).toFixed(2));

  let minDepth = 5.0;
  let maxWind = 0.0;
  let riskStart = -1;
  let riskEnd = -1;

  for (const h of hours) {
    let windDrop = 0;
    let wind = 3.5;
    let rumb = 'ЮВ';

    if (isCrisisMode) {
      if (h <= 12) {
        wind = Number((3.5 + (h / 12) * 3.5).toFixed(1));
        rumb = 'ЮВ';
        windDrop = 0;
      } else if (h <= 18) {
        const progress = (h - 12) / 6;
        wind = Number((8.0 + progress * 6.5).toFixed(1));
        rumb = 'СЗ';
        windDrop = Number((progress * 0.45).toFixed(2));
      } else if (h <= 30) {
        wind = 14.5;
        rumb = 'СЗ';
        windDrop = 0.60; // Максимальный ветровой сгон
      } else if (h <= 48) {
        const progress = (h - 30) / 18;
        wind = Number((14.5 - progress * 5.5).toFixed(1));
        rumb = 'СЗ';
        windDrop = Number((0.60 - progress * 0.35).toFixed(2));
      } else if (h <= 54) {
        const progress = (h - 48) / 6;
        wind = Number((9.0 - progress * 2.0).toFixed(1));
        rumb = 'СЗ';
        windDrop = Number((0.25 - progress * 0.15).toFixed(2));
      } else {
        const progress = (h - 54) / 18;
        wind = Number((7.0 - progress * 3.5).toFixed(1));
        rumb = progress > 0.5 ? 'ЮВ' : 'СЗ';
        windDrop = 0;
      }
    }

    const depth = Number((baseCalmDepth - windDrop).toFixed(2));
    if (depth < minDepth) minDepth = depth;
    if (wind > maxWind) maxWind = wind;

    const clearance = Number((depth - vesselDraftMeters).toFixed(2));
    const isRisk = depth < vesselDraftMeters;
    const isWarning = depth < vesselDraftMeters + 0.50;

    if (isRisk) {
      if (riskStart === -1) riskStart = h;
      riskEnd = h;
    }

    // Траектория движения судна от внешнего рейда (44.75, 47.92) к бару 151-155 км (45.27, 47.72)
    const etaProgress = vesselEtaBarHour > 0 ? Math.min(1, h / vesselEtaBarHour) : 1;
    const vesselLat = Number((44.75 + etaProgress * (45.27 - 44.75)).toFixed(4));
    const vesselLon = Number((47.92 - etaProgress * (47.92 - 47.72)).toFixed(4));

    const demurrage = isRisk
      ? Math.round(((h / 24) * Number(CASPIAN_ASSUMPTIONS.dailyDemurrageCostUsd.value)))
      : 0;

    points.push({
      hour: h,
      label: `T+${h}ч`,
      depthMeters: depth,
      vesselDraftMeters,
      clearanceMeters: clearance,
      windSpeedMs: wind,
      windRumb: rumb,
      isRisk,
      isWarning,
      vesselLat,
      vesselLon,
      etaOffsetHours: isRisk ? Math.max(0, (riskEnd !== -1 ? riskEnd : 54) - h) : 0,
      demurrageUsd: demurrage,
    });
  }

  // Расчет параметров в точке планового прибытия судна (ETA)
  // Получаем глубину в час vesselEtaBarHour
  let depthAtArrival = baseCalmDepth;
  if (isCrisisMode) {
    if (vesselEtaBarHour >= 18 && vesselEtaBarHour <= 30) {
      depthAtArrival = Number((baseCalmDepth - 0.60).toFixed(2));
    } else if (vesselEtaBarHour > 30 && vesselEtaBarHour <= 54) {
      const p = (vesselEtaBarHour - 30) / 24;
      depthAtArrival = Number((baseCalmDepth - 0.60 + p * 0.50).toFixed(2));
    } else if (vesselEtaBarHour > 9 && vesselEtaBarHour < 18) {
      const p = (vesselEtaBarHour - 9) / 9;
      depthAtArrival = Number((baseCalmDepth - p * 0.45).toFixed(2));
    }
  }

  const clearanceAtArrival = Number((depthAtArrival - vesselDraftMeters).toFixed(2));
  const hasRiskWindow = riskStart !== -1 && riskEnd !== -1;
  const isEtaInRiskWindow = hasRiskWindow && vesselEtaBarHour >= riskStart && vesselEtaBarHour <= riskEnd;
  const isSafePass = clearanceAtArrival >= 0;

  return {
    timeline: points,
    riskWindow: {
      startHour: riskStart !== -1 ? riskStart : 15,
      endHour: riskEnd !== -1 ? riskEnd : 54,
      durationHours: hasRiskWindow ? riskEnd - riskStart : 0,
      hasRisk: hasRiskWindow,
    },
    vesselDraftMeters,
    siltationMeters,
    vesselEtaBarHour,
    isEtaInRiskWindow,
    depthAtArrivalMeters: depthAtArrival,
    clearanceAtArrivalMeters: clearanceAtArrival,
    isSafePass,
    minDepthMeters: minDepth,
    maxWindSpeedMs: maxWind,
    provenance: 'assumption',
  };
}

/**
 * Получение интерполированных параметров в произвольный момент T+h (0..72 ч)
 */
export function getInterpolatedHydroPoint(
  forecast: HydroProfileForecast,
  targetHour: number
): HydroTimelinePoint {
  const { timeline, vesselEtaBarHour, vesselDraftMeters } = forecast;
  if (targetHour <= timeline[0].hour) return timeline[0];
  if (targetHour >= timeline[timeline.length - 1].hour) return timeline[timeline.length - 1];

  let lower = timeline[0];
  let upper = timeline[timeline.length - 1];

  for (let i = 0; i < timeline.length - 1; i++) {
    if (targetHour >= timeline[i].hour && targetHour <= timeline[i + 1].hour) {
      lower = timeline[i];
      upper = timeline[i + 1];
      break;
    }
  }

  const span = upper.hour - lower.hour;
  const t = span === 0 ? 0 : (targetHour - lower.hour) / span;

  const depth = Number((lower.depthMeters + (upper.depthMeters - lower.depthMeters) * t).toFixed(2));
  const wind = Number((lower.windSpeedMs + (upper.windSpeedMs - lower.windSpeedMs) * t).toFixed(1));
  const clearance = Number((depth - vesselDraftMeters).toFixed(2));
  const isRisk = depth < vesselDraftMeters;
  const isWarning = depth < vesselDraftMeters + 0.50;

  const etaProgress = vesselEtaBarHour > 0 ? Math.min(1, targetHour / vesselEtaBarHour) : 1;
  const lat = Number((44.75 + etaProgress * (45.27 - 44.75)).toFixed(4));
  const lon = Number((47.92 - etaProgress * (47.92 - 47.72)).toFixed(4));

  return {
    hour: targetHour,
    label: `T+${targetHour}ч`,
    depthMeters: depth,
    vesselDraftMeters,
    clearanceMeters: clearance,
    windSpeedMs: wind,
    windRumb: targetHour >= 12 && targetHour <= 54 ? 'СЗ' : 'ЮВ',
    isRisk,
    isWarning,
    vesselLat: lat,
    vesselLon: lon,
    etaOffsetHours: isRisk ? Math.max(0, 54 - targetHour) : 0,
    demurrageUsd: isRisk ? Math.round((targetHour / 24) * 15000) : 0,
  };
}
