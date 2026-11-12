import { CASPIAN_ASSUMPTIONS } from '../data/assumptions';

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
  provenance: 'assumption';
}

/**
 * Оценка 3 альтернативных сценариев при риске посадки на мель в ВКМСК
 */
export function evaluateDecisionScenarios(
  vesselDraftMeters = 4.15,
  currentDepthMeters = 3.55
): DecisionScenario[] {
  const dailyDemurrage = Number(CASPIAN_ASSUMPTIONS.dailyDemurrageCostUsd.value);
  const waitDays = 3;
  const waitDemurrage = dailyDemurrage * waitDays;
  const auxDieselCo2PerDay = Number(CASPIAN_ASSUMPTIONS.anchorAuxDieselCo2TonsPerDay.value);
  const waitCo2 = Number((waitDays * auxDieselCo2PerDay).toFixed(1));

  // 1. Сценарий: Ждать на рейде
  const waitScenario: DecisionScenario = {
    id: 'wait',
    title: 'Ждать на рейде',
    subtitle: 'Стоянка на внешнем рейде ВКМСК до смены ветра и подъёма уровня',
    deltaHours: 72.0,
    deltaCostUsd: waitDemurrage,
    deltaCo2Tons: waitCo2,
    feasibility: {
      draft: true,
      draftDetail: 'Глубина внешнего рейда 6.0 м достаточна для стоянки',
      berthAndCrane: false,
      berthAndCraneDetail: 'ОТКАЗ: Слот в порту Астрахань аннулируется через 3 ч задержки',
      rzdSlot: false,
      rzdSlotDetail: 'ОТКАЗ: Срыв графика РЖД, простой вагонов на путях',
      locomotive: false,
      locomotiveDetail: 'ОТКАЗ: Локомотив отцеплен и перенаправлен на другой состав',
    },
    isFeasible: false,
    rejectionReason: 'Аннулирование портового слота (порог >3 ч) и штрафы за простой подвижного состава РЖД.',
    isRecommended: false,
    provenance: 'assumption',
  };

  // 2. Сценарий: Caspian Sync-Slot (Махачкала)
  const rerouteSurcharge = Number(CASPIAN_ASSUMPTIONS.makhachkalaRerouteSurchargeUsd.value);
  const makhachkalaScenario: DecisionScenario = {
    id: 'makhachkala',
    title: 'Caspian Sync-Slot (Махачкала)',
    subtitle: 'Перенаправление в глубоководный порт Махачкала + стыковка с ниткой СКЖД',
    deltaHours: 1.5,
    deltaCostUsd: rerouteSurcharge,
    deltaCo2Tons: 5.4, // выбросы доп. плеча, но экономия vs стоянки
    feasibility: {
      draft: true,
      draftDetail: `Глубина 6.80 м > осадки ${vesselDraftMeters} м (запас +2.65 м)`,
      berthAndCrane: true,
      berthAndCraneDetail: 'Причал №4 свободен, кран «Сокол» 32 т готов к перевалке',
      rzdSlot: true,
      rzdSlotDetail: 'Согласована свободная нитка СКЖД №2042 (ст. Махачкала-Порт)',
      locomotive: true,
      locomotiveDetail: 'Выделен магистральный электровоз 2ЭС5К',
    },
    isFeasible: true,
    isRecommended: true,
    provenance: 'assumption',
  };

  // 3. Сценарий: Уменьшить загрузку (паузка на рейде)
  const lighteningCost = Number(CASPIAN_ASSUMPTIONS.lighteningOperationCostUsd.value);
  const lightenScenario: DecisionScenario = {
    id: 'lighten',
    title: 'Уменьшить загрузку (паузка)',
    subtitle: 'Перевалка 48 TEU на баржу-паузку на рейде для снижения осадки до 3.50 м',
    deltaHours: 28.0,
    deltaCostUsd: lighteningCost,
    deltaCo2Tons: 2.1,
    feasibility: {
      draft: true,
      draftDetail: `Осадка после паузки снизится до 3.50 м (меньше ${currentDepthMeters} м)`,
      berthAndCrane: false,
      berthAndCraneDetail: 'ОТКАЗ: Плавкран ПК-12 занят на аварийных работах в порту Оля',
      rzdSlot: false,
      rzdSlotDetail: 'ОТКАЗ: Партия делится на две части, распад контейнерного поезда',
      locomotive: true,
      locomotiveDetail: 'Локомотив ожидает формирования полного состава',
    },
    isFeasible: false,
    rejectionReason: 'Отсутствие сертифицированного плавкрана на рейде ВКМСК в течение 24 ч.',
    isRecommended: false,
    provenance: 'assumption',
  };

  return [waitScenario, makhachkalaScenario, lightenScenario];
}
