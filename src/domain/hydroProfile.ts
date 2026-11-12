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
    hasRisk: boolean;
  };
  minDepthMeters: number;
  maxWindSpeedMs: number;
  provenance: 'assumption';
}

/**
 * Расчет 72-часового предиктивного гидрологического профиля ВКМСК (151-155 км).
 * Моделирует прохождение циклона со сгонным СЗ ветром:
 * - 0ч-10ч: штатная обстановка (ЮВ ветер 3.5 м/с, глубина 4.40 м)
 * - 12ч-18ч: усиление ветра северных румбов, начало сгона
 * - 18ч-36ч: пик сгона (СЗ ветер до 14.5 м/с, глубина падает до 3.55 м < осадки 4.15 м) — ОКНО РИСКА
 * - 36ч-54ч: ослабление ветра (СЗ 9.0 м/с, медленный возврат уровня до 4.05 м)
 * - 54ч-72ч: смена на ЮВ румбы, нормализация уровня до 4.40 м
 */
export function generateHydroTimeline(
  vesselDraftMeters = 4.15,
  isCrisisMode = true
): HydroProfileForecast {
  const points: HydroTimelinePoint[] = [];
  const hours = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 42, 48, 54, 60, 66, 72];

  let minDepth = 5.0;
  let maxWind = 0.0;
  let riskStart = -1;
  let riskEnd = -1;

  for (const h of hours) {
    let depth = 4.40;
    let wind = 3.5;
    let rumb = 'ЮВ';

    if (isCrisisMode) {
      if (h <= 9) {
        wind = Number((3.5 + h * 0.4).toFixed(1));
        rumb = 'ЮВ';
        depth = 4.40;
      } else if (h <= 18) {
        // Разворот на СЗ и усиление
        const progress = (h - 9) / 9;
        wind = Number((7.0 + progress * 6.5).toFixed(1));
        rumb = 'СЗ';
        depth = Number((4.40 - progress * 0.70).toFixed(2));
      } else if (h <= 30) {
        // Пик сгона
        wind = 14.5;
        rumb = 'СЗ';
        depth = 3.55;
      } else if (h <= 48) {
        // Ослабление
        const progress = (h - 30) / 18;
        wind = Number((14.5 - progress * 6.0).toFixed(1));
        rumb = 'СЗ';
        depth = Number((3.55 + progress * 0.45).toFixed(2));
      } else {
        // Восстановление
        const progress = (h - 48) / 24;
        wind = Number((8.5 - progress * 4.5).toFixed(1));
        rumb = progress > 0.5 ? 'ЮВ' : 'СЗ';
        depth = Number((4.00 + progress * 0.40).toFixed(2));
      }
    }

    if (depth < minDepth) minDepth = depth;
    if (wind > maxWind) maxWind = wind;

    const clearance = Number((depth - vesselDraftMeters).toFixed(2));
    const isRisk = depth <= vesselDraftMeters;
    const isWarning = depth < vesselDraftMeters + 0.5;

    if (isRisk) {
      if (riskStart === -1) riskStart = h;
      riskEnd = h;
    }

    // Траектория движения судна по каналу к бару 151-155 км
    // При h=0: 45.65 (выше Оли), h=18: 45.42 (138 км), h=24: 45.30 (на входе в бар)
    const latProgress = Math.min(1, h / 24);
    const vesselLat = Number((45.65 - latProgress * 0.35).toFixed(4));
    const vesselLon = Number((47.58 + latProgress * 0.10).toFixed(4));

    // Расчет демереджа при задержке
    const delayHours = isRisk ? Number((h * 1.0).toFixed(1)) : 0;
    const demurrage = Number(
      ((delayHours / 24) * Number(CASPIAN_ASSUMPTIONS.dailyDemurrageCostUsd.value)).toFixed(0)
    );

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
      etaOffsetHours: isRisk ? Math.max(0, 48 - h) : 0,
      demurrageUsd: demurrage,
    });
  }

  return {
    timeline: points,
    riskWindow: {
      startHour: riskStart !== -1 ? riskStart : 14,
      endHour: riskEnd !== -1 ? riskEnd : 42,
      hasRisk: riskStart !== -1 || isCrisisMode,
    },
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
  const { timeline } = forecast;
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
  const draft = lower.vesselDraftMeters;
  const clearance = Number((depth - draft).toFixed(2));
  const isRisk = depth <= draft;
  const isWarning = depth < draft + 0.5;

  const lat = Number((lower.vesselLat + (upper.vesselLat - lower.vesselLat) * t).toFixed(4));
  const lon = Number((lower.vesselLon + (upper.vesselLon - lower.vesselLon) * t).toFixed(4));

  return {
    hour: targetHour,
    label: `T+${targetHour}ч`,
    depthMeters: depth,
    vesselDraftMeters: draft,
    clearanceMeters: clearance,
    windSpeedMs: wind,
    windRumb: targetHour >= 12 && targetHour <= 50 ? 'СЗ' : 'ЮВ',
    isRisk,
    isWarning,
    vesselLat: lat,
    vesselLon: lon,
    etaOffsetHours: isRisk ? Math.max(0, 48 - targetHour) : 0,
    demurrageUsd: isRisk ? Math.round((targetHour / 24) * 15000) : 0,
  };
}
