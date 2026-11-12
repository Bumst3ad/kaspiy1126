export interface ScenarioFeasibility {
  draft: boolean;
  draftDetail: string;
  berthAndCrane: boolean;
  berthAndCraneDetail: string;
  rzdSlot: boolean;
  rzdSlotDetail: string;
  locomotive: boolean;
  locomotiveDetail: string;
}

export interface ScenarioCalculationDetails {
  timeFormula: string;
  costFormula: string;
  co2Formula: string;
  assumptions: string[];
}

export interface DecisionScenario {
  id: 'wait' | 'makhachkala' | 'lighten' | 'pass';
  title: string;
  subtitle: string;
  deltaHours: number;
  deltaCostUsd: number;
  deltaCo2Tons: number;
  feasibility: ScenarioFeasibility;
  isFeasible: boolean; // все 4 фактора должны быть true
  rejectionReason?: string;
  isRecommended: boolean;
  calculationDetails: ScenarioCalculationDetails;
  provenance: 'assumption';
}

/**
 * Динамическая экспертная модель принятия решений при проходе лимитирующего бара ВКМСК.
 *
 * Алгоритм реагирует на входные параметры (осадка, час прибытия ETA, заносимость, сгон):
 * 1. Если осадка <= глубины (например, 3.40 м при глубине 3.55 м):
 *    -> Действий не требуется. Штатный проход по графику.
 * 2. Если ETA попадает в конец шторма (например, T+55ч..T+60ч), ожидание составляет <8 ч:
 *    -> Лучший сценарий: «Ждать на внешнем рейде» (дешевле и быстрее ухода в другой порт).
 * 3. Если ETA попадает в пик шторма (T+18ч..T+30ч), ожидание составляет >30 ч:
 *    -> Лучший сценарий: «Caspian Sync-Slot (Махачкала)» (100% реализуемость, спасение от потери $27k).
 */
export function evaluateDecisionScenarios(
  vesselDraftMeters = 4.15,
  depthAtArrival = 3.55,
  vesselEtaBarHour = 20,
  recoveryHour = 54
): DecisionScenario[] {
  const clearance = Number((depthAtArrival - vesselDraftMeters).toFixed(2));

  // ВЕТКА 1: Судно проходит без инцидента (например, типичная осадка 3.40 м при глубине 3.55 м)
  if (clearance >= 0) {
    const passScenario: DecisionScenario = {
      id: 'pass',
      title: 'Штатный проход по графику (ВКМСК)',
      subtitle: `Осадка ${vesselDraftMeters.toFixed(2)} м проходит лимитирующий бар (глубина ${depthAtArrival.toFixed(2)} м, запас +${clearance.toFixed(2)} м)`,
      deltaHours: 0.0,
      deltaCostUsd: 0,
      deltaCo2Tons: 0.0,
      feasibility: {
        draft: true,
        draftDetail: `Осадка ${vesselDraftMeters.toFixed(2)} м < глубины ${depthAtArrival.toFixed(2)} м (запас +${clearance.toFixed(2)} м)`,
        berthAndCrane: true,
        berthAndCraneDetail: 'Причал B-1 и кран KR-1 в порту Астрахань готовы по графику',
        rzdSlot: true,
        rzdSlotDetail: 'Базовая нитка RZD-Slot-A04 подтверждена',
        locomotive: true,
        locomotiveDetail: 'Маневровый локомотив LOC-12 подан',
      },
      isFeasible: true,
      isRecommended: true,
      calculationDetails: {
        timeFormula: 'ΔT = 0 ч (судно следует без отклонения от расписания)',
        costFormula: 'Δ$ = $0 (штрафы и демередж отсутствуют)',
        co2Formula: 'ΔCO2 = 0 т (плановый углеродный след рейса)',
        assumptions: [
          'Типичная осадка судов река-море на Каспии: 3.20-3.60 м',
          'При запасе >=0 м судоходство не прерывается',
        ],
      },
      provenance: 'assumption',
    };

    return [passScenario];
  }

  // ВЕТКА 2: Дефицит глубины на момент ETA (риск посадки на мель)
  // Расчет времени ожидания восстановления уровня
  const hoursToRecovery = Math.max(0, recoveryHour - vesselEtaBarHour);
  // Если ETA после 54ч, то ожидание 0 или минимальное (проводка каравана)
  const waitHours = hoursToRecovery > 0 ? Number((hoursToRecovery + 2.0).toFixed(1)) : 1.5;
  const demurrageRatePerHour = 15000 / 24; // 625 USD/ч
  const waitDemurrage = Math.round(waitHours * demurrageRatePerHour);
  const railcarsDemurrage = Math.round(waitHours * 70 * (120 / 95)); // $3360 при 38ч
  const totalWaitCost = waitDemurrage + railcarsDemurrage;
  const waitCo2 = Number((waitHours * 0.112).toFixed(1));

  // Анализ реализуемости ожидания (порог аннулирования слота принят за 6 часов, допущение)
  const SLOT_CANCELLATION_THRESHOLD = 6.0;
  const isWaitFeasible = waitHours <= SLOT_CANCELLATION_THRESHOLD;

  // Динамическая рекомендация:
  // Если ожидание короткое (<= 8 часов), ждать выгоднее, чем идти в Махачкалу!
  const isWaitRecommended = waitHours <= 8.0;
  const isMakhachkalaRecommended = !isWaitRecommended;

  // 1. Сценарий: Ждать на внешнем рейде
  const waitScenario: DecisionScenario = {
    id: 'wait',
    title: 'Ждать на внешнем рейде',
    subtitle: `Стоянка на рейде до подъема уровня (ожидание ${waitHours} ч)`,
    deltaHours: waitHours,
    deltaCostUsd: totalWaitCost,
    deltaCo2Tons: waitCo2,
    feasibility: {
      draft: true,
      draftDetail: 'Глубина внешнего рейда 9.5 м безопасна для отстоя',
      berthAndCrane: isWaitFeasible,
      berthAndCraneDetail: isWaitFeasible
        ? `Причал B-1 ожидает (задержка ${waitHours} ч в пределах нормы)`
        : `ОТКАЗ: Задержка ${waitHours} ч превышает порог слота (${SLOT_CANCELLATION_THRESHOLD} ч, допущение)`,
      rzdSlot: isWaitFeasible,
      rzdSlotDetail: isWaitFeasible
        ? 'Нитка RZD-Slot-A04 сдвинута в пределах технологического окна'
        : 'ОТКАЗ: Срыв графика РЖД, простой порожних платформ',
      locomotive: isWaitFeasible,
      locomotiveDetail: isWaitFeasible
        ? 'Локомотив LOC-12 зарезервирован'
        : 'ОТКАЗ: Локомотив переведен на другой состав',
    },
    isFeasible: isWaitFeasible,
    rejectionReason: !isWaitFeasible
      ? `Ожидание ${waitHours} ч превышает технологический порог удержания слота (${SLOT_CANCELLATION_THRESHOLD} ч, допущение) и влечет простой вагонов РЖД.`
      : undefined,
    isRecommended: isWaitRecommended,
    calculationDetails: {
      timeFormula: `ΔT = max(0, ${recoveryHour}ч - ${vesselEtaBarHour}ч) + 2ч проводки = ${waitHours} ч`,
      costFormula: `Δ$ = ${waitHours}ч * ($15 000 / 24 судно) + $${railcarsDemurrage} (штраф за простой вагонов) = +$${totalWaitCost.toLocaleString()}`,
      co2Formula: `ΔCO2 = ${waitHours}ч * 0.035 т/ч расхода MGO судовыми ДГ * 3.206 = +${waitCo2} т`,
      assumptions: [
        `Технологический порог ожидания слота: ${SLOT_CANCELLATION_THRESHOLD} ч (допущение)`,
        'Ставка чартера судна: $15 000/сут ($625/ч)',
        'Расход топлива ДГ на стоянке: 0.84 т/сут (IMO GHG Study)',
      ],
    },
    provenance: 'assumption',
  };

  // 2. Сценарий: Caspian Sync-Slot (Махачкала)
  // Морской путь от внешнего рейда: 213 км / 18.9 км/ч (10.2 узла) = 11.3 ч (vs канал 188 км / 14.8 км/ч = 12.7 ч -> море быстрее на -1.4 ч)
  // Доп. ж/д плечо СКЖД до Москвы: +450 км / 45 км/ч = +10.0 ч
  // Диспетчерская стыковка: +1.5 ч
  // Итого ΔT = +10.1 ч
  const deltaHoursMakhachkala = 10.1;
  const deltaCostMakhachkala = 16400; // Доп. тариф СКЖД ($20 600) - сборы ВКМСК ($4 200)
  const deltaCo2Makhachkala = 38.9;

  const makhachkalaScenario: DecisionScenario = {
    id: 'makhachkala',
    title: 'Caspian Sync-Slot (Махачкала)',
    subtitle: isMakhachkalaRecommended
      ? 'Переход в глубоководный порт Махачкала + сквозная нитка СКЖД (100% реализуемо)'
      : `Менее выгодно: переплата $${(deltaCostMakhachkala - totalWaitCost).toLocaleString()} ради экономии ${(waitHours - deltaHoursMakhachkala).toFixed(1)} ч`,
    deltaHours: deltaHoursMakhachkala,
    deltaCostUsd: deltaCostMakhachkala,
    deltaCo2Tons: deltaCo2Makhachkala,
    feasibility: {
      draft: true,
      draftDetail: `Глубина 6.80 м > осадки ${vesselDraftMeters} м (запас +${(6.80 - vesselDraftMeters).toFixed(2)} м)`,
      berthAndCrane: true,
      berthAndCraneDetail: 'Глубоководный причал B-4 свободен, кран KR-2 (32 т) готов к перевалке 218 TEU',
      rzdSlot: true,
      rzdSlotDetail: 'Сквозная нитка графика RZD-Slot-A17 согласована диспетчером',
      locomotive: true,
      locomotiveDetail: 'Магистральный локомотив LOC-41 подан под погрузку',
    },
    isFeasible: true,
    isRecommended: isMakhachkalaRecommended,
    calculationDetails: {
      timeFormula: `ΔT = ΔT_море (11.3ч - 12.7ч = -1.4ч) + ΔT_ж/д (+450км / 45км/ч = +10.0ч) + стыковка (+1.5ч) = +${deltaHoursMakhachkala} ч`,
      costFormula: `Δ$ = Доп. тариф ж/д плеча 450 км ($20 600 / $95 за TEU) - сборы ВКМСК ($4 200) = +$${deltaCostMakhachkala.toLocaleString()}`,
      co2Formula: `ΔCO2 = +450 км электротяги (+43.2 т) - предотвращенная стоянка (-${waitCo2} т) = +${deltaCo2Makhachkala} т (экономия vs фур: 1015 т)`,
      assumptions: [
        'Морской переход: 213 км по глубоководному морю без захода в канал',
        'Дополнительное ж/д плечо СКЖД до Москвы: +450 км (Прейскурант 10-01: $0.0105/т·км)',
        'Скорость контейнерного поезда: 45 км/ч (1080 км/сут)',
      ],
    },
    provenance: 'assumption',
  };

  // 3. Сценарий: Уменьшить загрузку (паузка на рейде)
  const lighteningHours = 22.0;
  const lighteningCost = 18500;
  const lighteningCo2 = 2.1;
  const targetReducedDraft = 3.50;
  const isLighteningDraftFeasible = targetReducedDraft <= depthAtArrival;

  const lightenScenario: DecisionScenario = {
    id: 'lighten',
    title: 'Уменьшить загрузку (паузка)',
    subtitle: `Перевалка 48 TEU на баржу-паузку на рейде для снижения осадки до ${targetReducedDraft.toFixed(2)} м`,
    deltaHours: lighteningHours,
    deltaCostUsd: lighteningCost,
    deltaCo2Tons: lighteningCo2,
    feasibility: {
      draft: isLighteningDraftFeasible,
      draftDetail: isLighteningDraftFeasible
        ? `Осадка снизится до ${targetReducedDraft.toFixed(2)} м (проходит глубину ${depthAtArrival.toFixed(2)} м)`
        : `ОТКАЗ: Осадка ${targetReducedDraft.toFixed(2)} м превышает экстремальное обмеление ${depthAtArrival.toFixed(2)} м`,
      berthAndCrane: false,
      berthAndCraneDetail: 'ОТКАЗ: Плавкран KR-Float-03 Росморпорта занят в порту Оля (задержка >24 ч)',
      rzdSlot: false,
      rzdSlotDetail: 'ОТКАЗ: Дробление партии нарушает норматив цельного поезда RZD-Slot-A04',
      locomotive: true,
      locomotiveDetail: 'Локомотив ожидает формирования полного состава',
    },
    isFeasible: false,
    rejectionReason: 'Отсутствие сертифицированного плавкрана на рейде ВКМСК в течение 24 ч и распад партии.',
    isRecommended: false,
    calculationDetails: {
      timeFormula: `ΔT = Переход плавкрана из порта Оля (12ч) + Перевалка 48 TEU (8ч) + Документы (2ч) = +${lighteningHours} ч`,
      costFormula: `Δ$ = Аренда плавкрана KR-Float-03 + баржа-паузка Росморпорта = +$${lighteningCost.toLocaleString()}`,
      co2Formula: `ΔCO2 = 0.65 т бункерного топлива плавкрана * 3.206 = +${lighteningCo2} т`,
      assumptions: [
        'Разгрузка 48 TEU (960 т) снижает осадку с 4.15 м до 3.50 м',
        'Аренда плавкрана: ~$18 500 за смену',
      ],
    },
    provenance: 'assumption',
  };

  // Возвращаем в порядке приоритета: рекомендованный сценарий идет первым
  const scenarios = [waitScenario, makhachkalaScenario, lightenScenario];
  scenarios.sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));

  return scenarios;
}
