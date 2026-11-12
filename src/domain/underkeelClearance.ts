import { CASPIAN_ASSUMPTIONS } from '../data/assumptions';

export interface UnderkeelResult {
  actualClearanceMeters: number;
  netSafetyClearanceMeters: number;
  safetyMarginMeters: number;
  isAgroundRisk: boolean;
  status: 'safe' | 'warning' | 'critical';
  provenance: 'real';
}

export interface ChannelDepthForecast {
  windSpeedMs: number;
  windDirectionDegrees: number;
  isSgonWind: boolean;
  depthDropMeters: number;
  predictedDepthMeters: number;
  uncertaintyIntervalMeters: [number, number];
  heuristicFormula: string;
  provenance: 'assumption';
}

/**
 * Прозрачная физическая эвристика глубины ВКМСК в зависимости от сгонного ветра
 * (Северо-восточный ветер 30-90° выдувает воду из устья Волги в открытое море)
 */
export function predictChannelDepth(
  windSpeedMs: number,
  windDirectionDegrees: number,
  baseDepthMeters = 4.5
): ChannelDepthForecast {
  // Сгонный сектор: 20° - 100° (СВ / Восток)
  const isSgonSector = windDirectionDegrees >= 20 && windDirectionDegrees <= 100;
  const isSgonWind = isSgonSector && windSpeedMs > 8.0;

  let depthDrop = 0;
  if (isSgonWind) {
    // При превышении 8 м/с уровень падает пропорционально квадрату скорости ветра
    const excessWind = windSpeedMs - 8.0;
    const maxDrop = Number(CASPIAN_ASSUMPTIONS.windTideDropMax.value);
    depthDrop = Math.min(maxDrop, Number((excessWind * 0.08).toFixed(2)));
  }

  const predictedDepth = Number((baseDepthMeters - depthDrop).toFixed(2));
  const uncertainty = 0.08; // +/- 8 см интервал неопределенности

  return {
    windSpeedMs,
    windDirectionDegrees,
    isSgonWind,
    depthDropMeters: depthDrop,
    predictedDepthMeters: predictedDepth,
    uncertaintyIntervalMeters: [
      Number((predictedDepth - uncertainty).toFixed(2)),
      Number((predictedDepth + uncertainty).toFixed(2)),
    ],
    heuristicFormula: 'depth = baseDepth - clamp(0, 0.65, (wind - 8) * 0.08)',
    provenance: 'assumption',
  };
}

/**
 * Расчет запаса под килем (UKC)
 * Запас под килем = глубина − осадка − запас безопасности
 */
export function calculateUnderkeelClearance(
  channelDepthMeters: number,
  vesselDraftMeters: number,
  safetyMarginMeters = Number(CASPIAN_ASSUMPTIONS.safetyUnderkeelMargin.value)
): UnderkeelResult {
  const actualClearance = Number((channelDepthMeters - vesselDraftMeters).toFixed(2));
  const netSafetyClearance = Number((actualClearance - safetyMarginMeters).toFixed(2));

  let status: 'safe' | 'warning' | 'critical' = 'safe';
  let isAgroundRisk = false;

  if (actualClearance <= 0) {
    status = 'critical';
    isAgroundRisk = true;
  } else if (netSafetyClearance < 0) {
    status = 'warning';
    isAgroundRisk = true;
  }

  return {
    actualClearanceMeters: actualClearance,
    netSafetyClearanceMeters: netSafetyClearance,
    safetyMarginMeters,
    isAgroundRisk,
    status,
    provenance: 'real',
  };
}
