import { CASPIAN_ASSUMPTIONS } from '../data/assumptions';

export interface TripartiteSyncPlan {
  status: 'recommended' | 'synced' | 'not_needed';
  originalPortId: string;
  targetPortId: string;
  targetPortName: string;
  targetBerthNumber: number;
  targetDepthMeters: number;
  rzdTimetableSlotNumber: string;
  rzdDestinationStation: string;
  predictedDelayHoursWithoutSync: number;
  predictedDelayHoursWithSync: number;
  delayHoursSaved: number;
  demurrageSavedUsd: number;
  co2SavedTons: number;
}

export function evaluateTripartiteSyncSlot(
  isAgroundRisk: boolean,
  estimatedVesselDelayHours: number
): TripartiteSyncPlan {
  const thresholdHours = Number(CASPIAN_ASSUMPTIONS.berthSlotCancellationThresholdHours.value);
  const dailyCostUsd = Number(CASPIAN_ASSUMPTIONS.dailyDemurrageCostUsd.value);

  if (!isAgroundRisk && estimatedVesselDelayHours < thresholdHours) {
    return {
      status: 'not_needed',
      originalPortId: 'RU_AST',
      targetPortId: 'RU_AST',
      targetPortName: 'Порт Астрахань',
      targetBerthNumber: 1,
      targetDepthMeters: 4.5,
      rzdTimetableSlotNumber: '№1102 (ПривЖД)',
      rzdDestinationStation: 'ст. Астрахань-2',
      predictedDelayHoursWithoutSync: estimatedVesselDelayHours,
      predictedDelayHoursWithSync: estimatedVesselDelayHours,
      delayHoursSaved: 0,
      demurrageSavedUsd: 0,
      co2SavedTons: 0,
    };
  }

  // При обмелении ВКМСК судно теряет 72 часа, пропуская слот причала
  const delayWithoutSync = isAgroundRisk ? 72.0 : estimatedVesselDelayHours;
  const delayWithSync = 1.5; // Время пересогласованного маневра в Махачкалу
  const delayHoursSaved = delayWithoutSync - delayWithSync;

  // Экономия на демередже (пропорционально дням задержки)
  const daysSaved = delayHoursSaved / 24.0;
  const demurrageSavedUsd = Math.round(daysSaved * dailyCostUsd);

  return {
    status: 'recommended',
    originalPortId: 'RU_AST',
    targetPortId: 'RU_MCX',
    targetPortName: 'Морской порт Махачкала',
    targetBerthNumber: 4,
    targetDepthMeters: 6.8, // Глубоководный причал без риска мели
    rzdTimetableSlotNumber: '№3801 (СКЖД)',
    rzdDestinationStation: 'ст. Махачкала-Порт',
    predictedDelayHoursWithoutSync: delayWithoutSync,
    predictedDelayHoursWithSync: delayWithSync,
    delayHoursSaved,
    demurrageSavedUsd,
    co2SavedTons: 18.4,
  };
}
