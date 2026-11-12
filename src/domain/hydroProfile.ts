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
    startHour: number; // T+15ч
    endHour: number;   // T+54ч (длительность окна 39 ч)
    durationHours: number; // 39 ч
    hasRisk: boolean;
  };
  vesselEtaBarHour: number; // Час планового прибытия судна на бар 151-155 км (T+20ч)
  isEtaInRiskWindow: boolean; // Прибытие судна попадает прямо в окно обмеления
  depthAtArrivalMeters: number;
  clearanceAtArrivalMeters: number;
  minDepthMeters: number;
  maxWindSpeedMs: number;
  provenance: 'assumption';
}

/**
 * Расчет 72-часового предиктивного гидрологического профиля ВКМСК (151-155 км).
 * Моделирует прохождение циклона со сгонным СЗ ветром:
 * - 0ч-12ч: штатная обстановка (ЮВ ветер 3.5 м/с, глубина 4.40 м)
 * - 15ч-54ч: ОКНО РИСКА ОБМЕЛЕНИЯ (длительность 39 часов, глубина 3.55-4.10 м < осадки 4.15 м)
 * - Пик сгона: 20-30ч (СЗ ветер до 14.5 м/с, глубина 3.55 м, дефицит -0.60 м)
 * - 54ч-72ч: смена на ЮВ румбы, нормализация уровня воды до 4.40 м
 *
 * СЮЖЕТ: Судно идет входящим рейсом из Ирана (Амирабад) на север.
 * Плановое расчетное время подхода судна к бару (ETA на 151-155 км) = T+20ч.
 * Поскольку T+20ч попадает в окно T+15..T+54ч, судно неминуемо сядет на мель без смены слота!
 */
export function generateHydroTimeline(
  vesselDraftMeters = 4.15,
  isCrisisMode = true,
  vesselEtaBarHour = 20
): HydroProfileForecast {
  const points: HydroTimelinePoint[] = [];
  const hours = [0, 3, 6, 9, 12, 15, 18, 20, 24, 27, 30, 33, 36, 42, 48, 54, 60, 66, 72];

  let minDepth = 5.0;
  let maxWind = 0.0;
  const riskStart = 15;
  const riskEnd = 54;

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
        depth = Number((4.40 - progress * 0.75).toFixed(2));
      } else if (h <= 30) {
        // Пик сгона
        wind = 14.5;
        rumb = 'СЗ';
        depth = 3.55;
      } else if (h <= 48) {
        // Ослабление ветра
        const progress = (h - 30) / 18;
        wind = Number((14.5 - progress * 5.5).toFixed(1));
        rumb = 'СЗ';
        depth = Number((3.55 + progress * 0.45).toFixed(2));
      } else if (h <= 54) {
        // Выход из критического сектора
        const progress = (h - 48) / 6;
        wind = Number((9.0 - progress * 2.0).toFixed(1));
        rumb = 'СЗ';
        depth = Number((4.00 + progress * 0.15).toFixed(2));
      } else {
        // Восстановление
        const progress = (h - 54) / 18;
        wind = Number((7.0 - progress * 3.5).toFixed(1));
        rumb = progress > 0.5 ? 'ЮВ' : 'СЗ';
        depth = Number((4.15 + progress * 0.25).toFixed(2));
      }
    }

    if (depth < minDepth) minDepth = depth;
    if (wind > maxWind) maxWind = wind;

    const clearance = Number((depth - vesselDraftMeters).toFixed(2));
    const isRisk = depth <= vesselDraftMeters;
    const isWarning = depth < vesselDraftMeters + 0.5;

    // Входящий рейс: судно подходит с юга (открытый Каспий км 188+, lat 44.75) к бару 151-155 км (lat 45.27)
    // При h=0: lat 44.75 (внешний рейд), при h=20 (ETA): lat 45.27 (лимитирующий бар)
    const etaProgress = Math.min(1, h / vesselEtaBarHour);
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
      etaOffsetHours: isRisk ? Math.max(0, riskEnd - h) : 0,
      demurrageUsd: demurrage,
    });
  }

  // Расчет параметров в точке планового прибытия судна (ETA)
  const isEtaInRiskWindow = isCrisisMode && vesselEtaBarHour >= riskStart && vesselEtaBarHour <= riskEnd;
  const depthAtArrival = isCrisisMode ? 3.55 : 4.40;
  const clearanceAtArrival = Number((depthAtArrival - vesselDraftMeters).toFixed(2));

  return {
    timeline: points,
    riskWindow: {
      startHour: riskStart,
      endHour: riskEnd,
      durationHours: riskEnd - riskStart, // 39 часов
      hasRisk: isCrisisMode,
    },
    vesselEtaBarHour,
    isEtaInRiskWindow,
    depthAtArrivalMeters: depthAtArrival,
    clearanceAtArrivalMeters: clearanceAtArrival,
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
  const { timeline, vesselEtaBarHour } = forecast;
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

  // Траектория движения входящего судна
  const etaProgress = Math.min(1, targetHour / vesselEtaBarHour);
  const lat = Number((44.75 + etaProgress * (45.27 - 44.75)).toFixed(4));
  const lon = Number((47.92 - etaProgress * (47.92 - 47.72)).toFixed(4));

  return {
    hour: targetHour,
    label: `T+${targetHour}ч`,
    depthMeters: depth,
    vesselDraftMeters: draft,
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
