import { CASPIAN_ASSUMPTIONS } from '../data/assumptions';

export const SYNC_SLOT_CONFIG = {
  slotNumber: 'RZD-Slot-A17',
  berthNumber: 'B-4',
  craneName: 'KR-2 (32 т)',
  locomotiveId: 'LOC-41',
  portId: 'RU_MCX',
  portName: 'Морской порт Махачкала',
  targetDepthMeters: 6.8,
  destinationStation: 'ст. Терминал Демо-Север',
};

export interface TripartiteSyncPlan {
  status: 'recommended' | 'synced' | 'not_needed';
  originalPortId: string;
  targetPortId: string;
  targetPortName: string;
  targetBerthNumber: number;
  targetBerthName: string;
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
      targetBerthName: 'B-1',
      targetDepthMeters: 4.5,
      rzdTimetableSlotNumber: 'RZD-Slot-A04',
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
    targetPortId: SYNC_SLOT_CONFIG.portId,
    targetPortName: SYNC_SLOT_CONFIG.portName,
    targetBerthNumber: 4,
    targetBerthName: SYNC_SLOT_CONFIG.berthNumber,
    targetDepthMeters: SYNC_SLOT_CONFIG.targetDepthMeters,
    rzdTimetableSlotNumber: SYNC_SLOT_CONFIG.slotNumber,
    rzdDestinationStation: 'ст. Махачкала-Порт',
    predictedDelayHoursWithoutSync: delayWithoutSync,
    predictedDelayHoursWithSync: delayWithSync,
    delayHoursSaved,
    demurrageSavedUsd,
    co2SavedTons: 18.4,
  };
}
