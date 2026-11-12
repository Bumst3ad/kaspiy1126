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
  id: 'wait' | 'makhachkala' | 'lighten';
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
 * Оценка 3 альтернативных сценариев при риске посадки на мель в ВКМСК
 * СЮЖЕТ: Входящий рейс из Ирана (Амирабад) на внешний рейд ВКМСК (км 188+)
 * Плановый подход к бару (151-155 км): T+20ч
 * Окно обмеления: T+15ч .. T+54ч (длительность 39ч)
 */
export function evaluateDecisionScenarios(
  vesselDraftMeters = 4.15,
  currentDepthMeters = 3.55,
  windowDurationHours = 39,
  arrivalHour = 20,
  recoveryHour = 54
): DecisionScenario[] {
  // 1. Сценарий: Ждать на внешнем рейде
  // Время ожидания = (T восстановления [54ч] - T прибытия [20ч]) + 4ч формирование каравана / проводка = 38ч
  const waitHours = Math.max(0, recoveryHour - arrivalHour) + 4.0; // 38.0 ч
  const demurrageRatePerHour = 15000 / 24; // 625 USD/ч
  const waitDemurrage = Math.round(waitHours * demurrageRatePerHour); // $23 750
  const railcarsDemurrage = Math.round(waitHours * 70 * (120 / 95)); // $3 360
  const totalWaitCost = waitDemurrage + railcarsDemurrage; // $27 110
  // CO2 от работы вспомогательных ДГ судна на якоре: 0.035 т/ч MGO * 3.206 т CO2/т = 0.112 т/ч
  const waitCo2 = Number((waitHours * 0.112).toFixed(1)); // +4.3 т

  const waitScenario: DecisionScenario = {
    id: 'wait',
    title: 'Ждать на внешнем рейде',
    subtitle: 'Стоянка на внешнем рейде (глубина 9.5 м) до спада ветра и подъема воды',
    deltaHours: waitHours,
    deltaCostUsd: totalWaitCost,
    deltaCo2Tons: waitCo2,
    feasibility: {
      draft: true,
      draftDetail: 'Глубина внешнего рейда 9.5 м безопасна для отстоя',
      berthAndCrane: false,
      berthAndCraneDetail: 'ОТКАЗ: Причальный слот в Астрахани аннулируется при опоздании >3 ч',
      rzdSlot: false,
      rzdSlotDetail: 'ОТКАЗ: Срыв графика РЖД, простой порожних платформ',
      locomotive: false,
      locomotiveDetail: 'ОТКАЗ: Локомотив отцеплен и переведен на другой наряд',
    },
    isFeasible: false,
    rejectionReason: `Аннулирование портового слота (порог >3 ч, фактическое ожидание ${waitHours} ч) и простой подвижного состава РЖД.`,
    isRecommended: false,
    calculationDetails: {
      timeFormula: `ΔT = (T_восстановления [${recoveryHour}ч] - T_прибытия [${arrivalHour}ч]) + 4ч проводки = ${waitHours} ч (окно на графике: ${windowDurationHours} ч)`,
      costFormula: `Δ$ = ${waitHours}ч * ($15 000 / 24 судно) + $${railcarsDemurrage} (штраф за простой 70 вагонов РЖД) = +$${totalWaitCost.toLocaleString()}`,
      co2Formula: `ΔCO2 = ${waitHours}ч * 0.035 т/ч расхода MGO судовыми ДГ * 3.206 т CO2/т топлива = +${waitCo2} т`,
      assumptions: [
        'Ставка чартера: $15 000/сут ($625/ч)',
        'Окно обмеления: T+15ч..T+54ч (39 ч)',
        'Расход MGO вспомогательными генераторами: 0.84 т/сут (IMO GHG Study)',
      ],
    },
    provenance: 'assumption',
  };

  // 2. Сценарий: Caspian Sync-Slot (Махачкала)
  // Морской путь от внешнего рейда:
  // До Махачкалы по глубокому морю: 213 км / 18.9 км/ч (10.2 узла) = 11.3 ч
  // До Астрахани по каналу: 188 км / 14.8 км/ч (8 узлов) = 12.7 ч -> море быстрее на -1.4 ч!
  // Ж/Д плечо до Москвы (ТЛЦ Белый Раст):
  // Астрахань -> Москва: 1530 км / 45 км/ч = 34.0 ч
  // Махачкала -> Москва (СКЖД): 1980 км / 45 км/ч = 44.0 ч (доп. плечо +450 км = +10.0 ч)
  // Диспетчерская стыковка слота РЖД/Порт/Судно: +1.5 ч
  // Итого ΔT = -1.4ч + 10.0ч + 1.5ч = +10.1 ч!
  const deltaHoursMakhachkala = 10.1;
  // Стоимость: доп. тариф СКЖД за 450 км для 4360 т (218 TEU): 4360 * 450 * 0.0105$ = $20 600
  // Экономия на канальном и лоцманском сборе ВКМСК: -$4 200
  // Итого Δ$ = 20600 - 4200 = $16 400
  const deltaCostMakhachkala = 16400;
  // CO2: ж/д плечо +450 км (450 * 4360 * 22г / 10^6 = +43.2 т) минус стоянка на якоре (4.3 т) = +38.9 т
  // При этом суммарный маршрут экономит 1015 т CO2 относительно фур!
  const deltaCo2Makhachkala = 38.9;

  const makhachkalaScenario: DecisionScenario = {
    id: 'makhachkala',
    title: 'Caspian Sync-Slot (Махачкала)',
    subtitle: 'Переход в глубоководный незамерзающий порт Махачкала + сквозная нитка СКЖД',
    deltaHours: deltaHoursMakhachkala,
    deltaCostUsd: deltaCostMakhachkala,
    deltaCo2Tons: deltaCo2Makhachkala,
    feasibility: {
      draft: true,
      draftDetail: `Глубина 6.80 м > осадки ${vesselDraftMeters} м (запас +2.65 м)`,
      berthAndCrane: true,
      berthAndCraneDetail: 'Причал №4 свободен, кран «Сокол» 32 т готов к перевалке 218 TEU',
      rzdSlot: true,
      rzdSlotDetail: 'Сквозная нитка СКЖД №2042 зарезервирована диспетчером',
      locomotive: true,
      locomotiveDetail: 'Магистральный электровоз 2ЭС5К ст. Махачкала-Порт подан под погрузку',
    },
    isFeasible: true,
    isRecommended: true,
    calculationDetails: {
      timeFormula: `ΔT = ΔT_море (11.3ч - 12.7ч = -1.4ч) + ΔT_ж/д (+450км / 45км/ч = +10.0ч) + стыковка слота (+1.5ч) = +${deltaHoursMakhachkala} ч`,
      costFormula: `Δ$ = Доп. ж/д тариф СКЖД 450 км ($20 600 / $95 за TEU) - сборы ВКМСК ($4 200) = +$${deltaCostMakhachkala.toLocaleString()}`,
      co2Formula: `ΔCO2 = +450 км электротяги РЖД (+43.2 т) - предотвращенные выбросы простоя судна (-4.3 т) = +${deltaCo2Makhachkala} т (экономия vs фур: 1015 т)`,
      assumptions: [
        'Расстояние море: внешний рейд -> Махачкала 213 км (11.3 ч при 10.2 узла)',
        'Ж/Д расстояние до Москвы: Астрахань 1530 км vs Махачкала 1980 км (Δ = +450 км)',
        'Маршрутная скорость контейнерного поезда: 45 км/ч (1080 км/сут, график РЖД)',
        'Тариф РЖД Прейскурант 10-01: $0.0105 за т·км',
      ],
    },
    provenance: 'assumption',
  };

  // 3. Сценарий: Уменьшить загрузку (паузка на рейде)
  const lighteningHours = 22.0;
  const lighteningCost = 18500;
  const lighteningCo2 = 2.1;

  const lightenScenario: DecisionScenario = {
    id: 'lighten',
    title: 'Уменьшить загрузку (паузка)',
    subtitle: 'Перевалка 48 TEU на баржу-паузку на внешнем рейде для снижения осадки до 3.50 м',
    deltaHours: lighteningHours,
    deltaCostUsd: lighteningCost,
    deltaCo2Tons: lighteningCo2,
    feasibility: {
      draft: true,
      draftDetail: `Осадка после отгрузки 48 TEU снизится до 3.50 м (< глубины ${currentDepthMeters} м)`,
      berthAndCrane: false,
      berthAndCraneDetail: 'ОТКАЗ: Плавкран ПК-12 Росморпорта занят в порту Оля (задержка >24 ч)',
      rzdSlot: false,
      rzdSlotDetail: 'ОТКАЗ: Дробление партии нарушает норматив цельного контейнерного поезда',
      locomotive: true,
      locomotiveDetail: 'Локомотив ожидает формирования полного состава',
    },
    isFeasible: false,
    rejectionReason: 'Отсутствие сертифицированного плавкрана на рейде ВКМСК в течение 24 ч.',
    isRecommended: false,
    calculationDetails: {
      timeFormula: `ΔT = Переход плавкрана из порта Оля (12ч) + Перевалка 48 TEU со скоростью 6 TEU/ч (8ч) + Документы (2ч) = +${lighteningHours} ч`,
      costFormula: `Δ$ = Аренда плавкрана ПК-12 (смена 12ч) + буксир-толкач + баржа-паузка = +$${lighteningCost.toLocaleString()}`,
      co2Formula: `ΔCO2 = 0.65 т бункерного топлива плавкрана и буксира * 3.206 = +${lighteningCo2} т`,
      assumptions: [
        'Разгрузка 48 TEU (960 т) снижает осадку с 4.15 м до 3.50 м (запас 5 см)',
        'Ставка аренды плавкрана Росморпорта: 1.8 млн руб (~$18 500)',
      ],
    },
    provenance: 'assumption',
  };

  return [waitScenario, makhachkalaScenario, lightenScenario];
}
