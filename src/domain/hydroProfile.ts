import { CASPIAN_ASSUMPTIONS } from '../data/assumptions';

export interface HydroTimelinePoint {
  hour: number;
  label: string;
  depthMeters: number;
  p10DepthMeters: number; // Нижняя граница 80% доверительного интервала (P10)
  p90DepthMeters: number; // Верхняя граница 80% доверительного интервала (P90)
  vesselDraftMeters: number;
  clearanceMeters: number;
  windSpeedMs: number;
  windRumb: string;
  isRisk: boolean;
  isWarning: boolean;
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
  vesselEtaBarHour: number;
  isEtaInRiskWindow: boolean;
  depthAtArrivalMeters: number;
  clearanceAtArrivalMeters: number;
  isSafePass: boolean;
  minDepthMeters: number;
  maxWindSpeedMs: number;
  provenance: 'assumption';
}

/**
 * Расчет 72-часового предиктивного гидрологического профиля ВКМСК (151-155 км).
 * Включает доверительный интервал неопределенности P10-P90 (погрешность гидродинамической модели).
 */
export function generateHydroTimeline(
  vesselDraftMeters = 4.15,
  isCrisisMode = true,
  vesselEtaBarHour = 20,
  siltationMeters = 0.35,
  isJuneHistorical = false
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

    if (isJuneHistorical) {
      // Историческая реконструкция июньского кризиса:
      // Устойчивый ветер 9.0 м/с (СЗ) и падение морского фона (0.47 м) + ветровой сгон (0.10 м) = 0.57 м
      wind = 9.0;
      rumb = 'СЗ';
      windDrop = 0.57;
    } else if (isCrisisMode) {
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
        windDrop = 0.60;
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

    // Полоса неопределенности P10-P90: в штиль +/- 8 см, в шторм +/- 15 см
    const uncertainty = h >= 15 && h <= 50 ? 0.15 : 0.08;
    const p10 = Number((depth - uncertainty).toFixed(2));
    const p90 = Number((depth + uncertainty).toFixed(2));

    const clearance = Number((depth - vesselDraftMeters).toFixed(2));
    const isRisk = depth < vesselDraftMeters;
    const isWarning = depth < vesselDraftMeters + 0.50;

    if (isRisk) {
      if (riskStart === -1) riskStart = h;
      riskEnd = h;
    }

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
      p10DepthMeters: p10,
      p90DepthMeters: p90,
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
  let depthAtArrival = baseCalmDepth;
  if (isJuneHistorical) {
    depthAtArrival = Number((baseCalmDepth - 0.57).toFixed(2));
  } else if (isCrisisMode) {
    if (vesselEtaBarHour >= 18 && vesselEtaBarHour <= 30) {
      depthAtArrival = Number((baseCalmDepth - 0.60).toFixed(2));
    } else if (vesselEtaBarHour > 30 && vesselEtaBarHour <= 54) {
      const p = (vesselEtaBarHour - 30) / 24;
      depthAtArrival = Number((baseCalmDepth - 0.60 + p * 0.50).toFixed(2));
    } else if (vesselEtaBarHour > 12 && vesselEtaBarHour < 18) {
      const p = (vesselEtaBarHour - 12) / 6;
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
  const p10 = Number((lower.p10DepthMeters + (upper.p10DepthMeters - lower.p10DepthMeters) * t).toFixed(2));
  const p90 = Number((lower.p90DepthMeters + (upper.p90DepthMeters - lower.p90DepthMeters) * t).toFixed(2));
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
    p10DepthMeters: p10,
    p90DepthMeters: p90,
    vesselDraftMeters,
    clearanceMeters: clearance,
    windSpeedMs: wind,
    windRumb: lower.windRumb,
    isRisk,
    isWarning,
    vesselLat: lat,
    vesselLon: lon,
    etaOffsetHours: isRisk ? Math.max(0, 54 - targetHour) : 0,
    demurrageUsd: isRisk ? Math.round((targetHour / 24) * 15000) : 0,
  };
}

/**
 * Расчет вероятности риска посадки на мель P(глубина < осадка) по нормальному распределению
 * из доверительного интервала прогноза P10-P90:
 * σ = (P90 - P10) / 2.563
 * μ = глубина (медиана / матожидание прогноза)
 */
export function calculateGroundingProbability(
  vesselDraftMeters: number,
  depthMeters: number,
  p10Meters: number,
  p90Meters: number
): number {
  if (depthMeters >= vesselDraftMeters + 0.50) return 0;
  const p10 = Math.min(p10Meters, p90Meters);
  const p90 = Math.max(p10Meters, p90Meters);
  const span = p90 - p10;
  const sigma = span > 0.001 ? span / 2.563 : 0.08;
  const mu = depthMeters;
  const z = (vesselDraftMeters - mu) / sigma;

  // Точная аппроксимация интеграла вероятности стандартного нормального распределения CDF: Φ(z)
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const poly = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = z >= 0 ? 1 - d * poly : d * poly;

  const pct = Math.round(cdf * 100);
  return Math.max(1, Math.min(99, pct));
}
