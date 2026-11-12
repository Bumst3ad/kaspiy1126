import { CASPIAN_ASSUMPTIONS } from '../data/assumptions';

export interface UnderkeelResult {
  actualClearanceMeters: number;
  netSafetyClearanceMeters: number;
  safetyMarginMeters: number;
  isAgroundRisk: boolean;
  status: 'safe' | 'warning' | 'critical';
  statusLabel: string;
  provenance: 'real';
}

export interface ChannelDepthForecast {
  windSpeedMs: number;
  windDirectionDegrees: number;
  windRumb: string;
  isSgonWind: boolean;
  depthDropMeters: number;
  predictedDepthMeters: number;
  uncertaintyIntervalMeters: [number, number];
  heuristicFormula: string;
  provenance: 'assumption';
}

/**
 * Прозрачная физическая эвристика глубины ВКМСК в зависимости от ветра.
 * Согласно ГУ МЧС по АО и КаспНИРХ:
 * - Сгонный сектор: СЗ и С румбы (270°-360° / 0°-20°). Выдувают воду из дельты Волги в открытый Каспий.
 * - Нагонный сектор: ЮВ и Ю румбы (120°-180°). Повышают уровень воды в северо-западной части моря.
 */
export function predictChannelDepth(
  windSpeedMs: number,
  windDirectionDegrees: number,
  baseDepthMeters = Number(CASPIAN_ASSUMPTIONS.vkmskActualBaselineDepth?.value || 4.15)
): ChannelDepthForecast {
  // Сгонный сектор: 270° - 360° (СЗ) или 0° - 20° (Север)
  const isSgonSector =
    (windDirectionDegrees >= 270 && windDirectionDegrees <= 360) ||
    (windDirectionDegrees >= 0 && windDirectionDegrees <= 20);

  const isSgonWind = isSgonSector && windSpeedMs > 8.0;

  let depthDrop = 0;
  if (isSgonWind) {
    // При превышении 8 м/с уровень падает: до 0.60-0.65 м при СЗ шторме >14 м/с
    const excessWind = windSpeedMs - 8.0;
    const maxDrop = 0.65;
    depthDrop = Math.min(maxDrop, Number((excessWind * 0.09).toFixed(2)));
  }

  const predictedDepth = Number((baseDepthMeters - depthDrop).toFixed(2));
  const uncertainty = 0.08; // +/- 8 см интервал неопределенности

  const windRumb = isSgonSector ? 'СЗ' : windDirectionDegrees >= 110 && windDirectionDegrees <= 160 ? 'ЮВ' : 'Штиль';

  return {
    windSpeedMs,
    windDirectionDegrees,
    windRumb,
    isSgonWind,
    depthDropMeters: depthDrop,
    predictedDepthMeters: predictedDepth,
    uncertaintyIntervalMeters: [
      Number((predictedDepth - uncertainty).toFixed(2)),
      Number((predictedDepth + uncertainty).toFixed(2)),
    ],
    heuristicFormula: 'depth = baseDepth - clamp(0, 0.65, (windSpeed - 8.0) * 0.09)',
    provenance: 'assumption',
  };
}

/**
 * Расчет запаса под килем (UKC) с нормативным порогом безопасности 0.50 м (допущение).
 * Запас под килем = глубина − осадка.
 * Пороги:
 * - >= 0.50 м: 'safe' (зеленый) — безопасный запас
 * - 0.00 .. 0.49 м: 'warning' (желтый) — минимальный запас, требуется контроль
 * - < 0.00 м: 'critical' (красный) — посадка на мель
 */
export function calculateUnderkeelClearance(
  channelDepthMeters: number,
  vesselDraftMeters: number,
  safetyMarginMeters = Number(CASPIAN_ASSUMPTIONS.ukcSafetyThreshold?.value || 0.5)
): UnderkeelResult {
  const actualClearance = Number((channelDepthMeters - vesselDraftMeters).toFixed(2));
  const netSafetyClearance = Number((actualClearance - safetyMarginMeters).toFixed(2));

  let status: 'safe' | 'warning' | 'critical' = 'safe';
  let statusLabel = 'Запас в норме (>=0.5 м)';
  let isAgroundRisk = false;

  if (actualClearance <= 0) {
    status = 'critical';
    statusLabel = 'Риск посадки на мель';
    isAgroundRisk = true;
  } else if (actualClearance < safetyMarginMeters) {
    status = 'warning';
    statusLabel = 'Минимальный запас <0.5 м (допущение)';
    isAgroundRisk = false;
  }

  return {
    actualClearanceMeters: actualClearance,
    netSafetyClearanceMeters: netSafetyClearance,
    safetyMarginMeters,
    isAgroundRisk,
    status,
    statusLabel,
    provenance: 'real',
  };
}
