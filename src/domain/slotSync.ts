import { SYNC_SLOT_CONFIG } from './syncSlot';

export interface SlotTrackEvent {
  id: string;
  party: 'vessel' | 'port' | 'rail';
  partyLabel: string;
  actionLabel: string;
  startHour: number;
  endHour: number;
  hours: number;
  bufferAfterHours?: number;
  status: 'ok' | 'conflict' | 'active';
  detail: string;
  resourceId: string;
}

export interface SlotTimelineModel {
  isSynced: boolean;
  hasConflict: boolean;
  timeSpan: { minHour: number; maxHour: number };
  vesselTrack: SlotTrackEvent[];
  portTrack: SlotTrackEvent[];
  railTrack: SlotTrackEvent[];
  portBufferHours: number;
  railBufferHours: number;
  statusSummary: string;
}

/**
 * Расчет трехстороннего графика синхронизации (Судно | Порт | РЖД) на единой оси времени.
 * waitHours берется строго из общего расчета задержки (scenarioDecision), исключая расхождения.
 */
export function calculateSlotTimeline(
  isCrisisActive: boolean,
  isSlotSynced: boolean,
  waitHours = 36.0
): SlotTimelineModel {
  const minHour = 0;
  const maxHour = 60;

  if (isSlotSynced) {
    // СИНХРОНИЗИРОВАННЫЙ РЕЖИМ (Махачкала):
    // 1. Судно: Морской переход (11.5 ч) + швартовка (1.0 ч)
    const vesselTrack: SlotTrackEvent[] = [
      {
        id: 'vessel-voyage',
        party: 'vessel',
        partyLabel: 'Судно',
        actionLabel: 'Переход',
        startHour: 0,
        endHour: 11.5,
        hours: 11.5,
        status: 'ok',
        detail: 'Морской переход с внешнего рейда в Махачкалу по морю (>18 м)',
        resourceId: 'MV Demo-01',
      },
      {
        id: 'vessel-berthing',
        party: 'vessel',
        partyLabel: 'Судно',
        actionLabel: 'Швартовка',
        startHour: 11.5,
        endHour: 12.5,
        hours: 1.0,
        bufferAfterHours: 1.0, // буфер 1 ч между швартовкой и работой крана
        status: 'ok',
        detail: `Швартовка у причала ${SYNC_SLOT_CONFIG.berthNumber} (глубина 6.8 м)`,
        resourceId: 'Причал B-4',
      },
    ];

    // 2. Порт: Выгрузка 218 TEU краном KR-2 (8.0 ч)
    const portTrack: SlotTrackEvent[] = [
      {
        id: 'port-crane',
        party: 'port',
        partyLabel: 'Порт',
        actionLabel: 'Кран KR-2',
        startHour: 13.5,
        endHour: 21.5,
        hours: 8.0,
        bufferAfterHours: 0.5, // буфер 0.5 ч между краном и отправкой
        status: 'ok',
        detail: `Выгрузка 218 TEU краном ${SYNC_SLOT_CONFIG.craneName}, норма 28 движ/ч`,
        resourceId: SYNC_SLOT_CONFIG.craneName,
      },
    ];

    // 3. РЖД: Подача состава и отправление ускоренного поезда
    const railTrack: SlotTrackEvent[] = [
      {
        id: 'rail-loco',
        party: 'rail',
        partyLabel: 'РЖД',
        actionLabel: 'Подача',
        startHour: 20.0,
        endHour: 22.0,
        hours: 2.0,
        status: 'ok',
        detail: `Локомотив ${SYNC_SLOT_CONFIG.locomotiveId} подан под погрузку`,
        resourceId: SYNC_SLOT_CONFIG.locomotiveId,
      },
      {
        id: 'rail-departure',
        party: 'rail',
        partyLabel: 'РЖД',
        actionLabel: 'Нитка A-17',
        startHour: 22.0,
        endHour: 25.0,
        hours: 3.0,
        status: 'active',
        detail: `Сквозная нитка ${SYNC_SLOT_CONFIG.slotNumber} до ${SYNC_SLOT_CONFIG.destinationStation}`,
        resourceId: SYNC_SLOT_CONFIG.slotNumber,
      },
    ];

    return {
      isSynced: true,
      hasConflict: false,
      timeSpan: { minHour, maxHour },
      vesselTrack,
      portTrack,
      railTrack,
      portBufferHours: 1.0,
      railBufferHours: 0.5,
      statusSummary: 'Сквозной слот активен: стыковка судна, крана и РЖД с гарантированными буферами',
    };
  }

  if (isCrisisActive) {
    // КОНФЛИКТНЫЙ РЕЖИМ (Сгон ВКМСК без решения)
    // Единое время ожидания waitHours из общего расчета
    const vesselWaitStart = 15.0;
    const vesselWaitEnd = Math.min(60, Number((vesselWaitStart + waitHours).toFixed(1)));
    const vesselActualWait = Number((vesselWaitEnd - vesselWaitStart).toFixed(1));

    const vesselTrack: SlotTrackEvent[] = [
      {
        id: 'vessel-stuck',
        party: 'vessel',
        partyLabel: 'Судно',
        actionLabel: `Простой (${vesselActualWait}ч)`,
        startHour: vesselWaitStart,
        endHour: vesselWaitEnd,
        hours: vesselActualWait,
        status: 'conflict',
        detail: `Осадка превышает глубину бара. Вынужденный отстой на рейде ${vesselActualWait} ч`,
        resourceId: 'MV Demo-01',
      },
    ];

    const portTrack: SlotTrackEvent[] = [
      {
        id: 'port-missed',
        party: 'port',
        partyLabel: 'Порт',
        actionLabel: 'Срыв причала B-1',
        startHour: 20.0,
        endHour: 28.0,
        hours: 8.0,
        status: 'conflict',
        detail: 'Окно причала упущено, судно застряло на внешнем рейде',
        resourceId: 'Причал B-1 (Астрахань)',
      },
    ];

    const railTrack: SlotTrackEvent[] = [
      {
        id: 'rail-dropped',
        party: 'rail',
        partyLabel: 'РЖД',
        actionLabel: 'Срыв нитки A04',
        startHour: 24.0,
        endHour: 30.0,
        hours: 6.0,
        status: 'conflict',
        detail: 'Простой платформ превысил лимит, нитка РЖД аннулирована диспетчером',
        resourceId: 'RZD-Slot-A04',
      },
    ];

    return {
      isSynced: false,
      hasConflict: true,
      timeSpan: { minHour, maxHour },
      vesselTrack,
      portTrack,
      railTrack,
      portBufferHours: -18.0,
      railBufferHours: -24.0,
      statusSummary: `КРИТИЧЕСКИЙ КОНФЛИКТ: нестыковка судна и нитки РЖД (простой на рейде ${vesselActualWait} ч)`,
    };
  }

  // ШТАТНЫЙ РЕЖИМ
  const vesselTrack: SlotTrackEvent[] = [
    {
      id: 'vessel-normal',
      party: 'vessel',
      partyLabel: 'Судно',
      actionLabel: 'Ход',
      startHour: 0,
      endHour: 20.0,
      hours: 20.0,
      bufferAfterHours: 1.0,
      status: 'ok',
      detail: 'Входящий проход канала до порта Астрахань',
      resourceId: 'MV Demo-01',
    },
  ];

  const portTrack: SlotTrackEvent[] = [
    {
      id: 'port-normal',
      party: 'port',
      partyLabel: 'Порт',
      actionLabel: 'Кран',
      startHour: 21.0,
      endHour: 29.0,
      hours: 8.0,
      bufferAfterHours: 0.5,
      status: 'ok',
      detail: 'Выгрузка партии по штатному расписанию',
      resourceId: 'Причал B-1',
    },
  ];

  const railTrack: SlotTrackEvent[] = [
    {
      id: 'rail-normal',
      party: 'rail',
      partyLabel: 'РЖД',
      actionLabel: 'Поезд',
      startHour: 29.5,
      endHour: 33.0,
      hours: 3.5,
      status: 'ok',
      detail: 'Штатная отправка ускоренного контейнерного поезда',
      resourceId: 'RZD-Slot-A04',
    },
  ];

  return {
    isSynced: false,
    hasConflict: false,
    timeSpan: { minHour, maxHour },
    vesselTrack,
    portTrack,
    railTrack,
    portBufferHours: 1.0,
    railBufferHours: 0.5,
    statusSummary: 'Штатный график: стыковка обеспечена без сбоев',
  };
}
