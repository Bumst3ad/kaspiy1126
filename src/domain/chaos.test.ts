import { describe, it, expect } from 'vitest';
import { generateHydroTimeline, getInterpolatedHydroPoint } from './hydroProfile';
import { evaluateDecisionScenarios } from './scenarioDecision';
import { calculateSlotTimeline } from './slotSync';

describe('Chaos & Edge-Case Matrix Test', () => {
  const scenarios: Array<'nominal' | 'sgon' | 'june2026'> = ['nominal', 'sgon', 'june2026'];
  const drafts = [3.40, 4.15];
  const etas = [10, 20, 58];
  const siltations = [0.10, 0.35, 0.55];

  let testCount = 0;

  scenarios.forEach((scenarioPreset) => {
    drafts.forEach((draft) => {
      etas.forEach((eta) => {
        siltations.forEach((siltation) => {
          testCount++;
          const testName = `[${testCount}] ${scenarioPreset} | draft=${draft}m | ETA=T+${eta}h | siltation=-${siltation}m`;

          it(testName, () => {
            const isCrisisActive = scenarioPreset !== 'nominal';
            const isJuneMode = scenarioPreset === 'june2026';

            // 1. Гидрологический прогноз
            const hydro = generateHydroTimeline(draft, isCrisisActive, eta, siltation, isJuneMode);

            expect(Number.isNaN(hydro.depthAtArrivalMeters)).toBe(false);
            expect(hydro.depthAtArrivalMeters).toBeGreaterThan(0);
            expect(Number.isNaN(hydro.clearanceAtArrivalMeters)).toBe(false);
            expect(Number.isNaN(hydro.arrivalGroundingProbabilityPercent)).toBe(false);
            expect(hydro.arrivalGroundingProbabilityPercent).toBeGreaterThanOrEqual(0);
            expect(hydro.arrivalGroundingProbabilityPercent).toBeLessThanOrEqual(100);

            // 2. Интерполяция в контрольные точки
            [0, 12, 24, 48, 72].forEach((hour) => {
              const pt = getInterpolatedHydroPoint(hydro, hour);
              expect(Number.isNaN(pt.depthMeters)).toBe(false);
              expect(pt.depthMeters).toBeGreaterThan(0);
              expect(Number.isNaN(pt.windSpeedMs)).toBe(false);
              expect(pt.windSpeedMs).toBeGreaterThanOrEqual(0);
              expect(Number.isNaN(pt.demurrageUsd)).toBe(false);
              expect(pt.demurrageUsd).toBeGreaterThanOrEqual(0);
            });

            // 3. Модель принятия решений
            const decisionScenarios = evaluateDecisionScenarios(
              draft,
              hydro.depthAtArrivalMeters,
              eta,
              hydro.riskWindow.endHour
            );

            expect(decisionScenarios.length).toBeGreaterThan(0);

            const recommended = decisionScenarios.find((s) => s.isRecommended);
            expect(recommended).toBeDefined();

            // Критерий 1: Рекомендованный вариант ВСЕГДА реализуем
            expect(recommended?.isFeasible).toBe(true);

            // Критерий 2: Все дельты неотрицательны и не NaN
            decisionScenarios.forEach((sc) => {
              expect(Number.isNaN(sc.deltaHours)).toBe(false);
              expect(sc.deltaHours).toBeGreaterThanOrEqual(0);
              expect(Number.isNaN(sc.deltaCostUsd)).toBe(false);
              expect(sc.deltaCostUsd).toBeGreaterThanOrEqual(0);
              expect(Number.isNaN(sc.deltaCo2Tons)).toBe(false);
              expect(sc.deltaCo2Tons).toBeGreaterThanOrEqual(0);
            });

            // Критерий 3: При отсутствии риска нет рекомендации «в Махачкалу», заголовок «проход обеспечен»
            const hasNoRisk = hydro.clearanceAtArrivalMeters >= 0;
            if (hasNoRisk) {
              expect(recommended?.id).not.toBe('makhachkala');
              expect(recommended?.title.toLowerCase()).toContain('проход обеспечен');
            }

            // Критерий 4: Согласованность данных графиков трехсторонней синхронизации слота
            const waitScenario = decisionScenarios.find((s) => s.id === 'wait') || decisionScenarios[0];
            const slotTimelineConflict = calculateSlotTimeline(isCrisisActive, false, waitScenario.deltaHours);
            const slotTimelineSynced = calculateSlotTimeline(isCrisisActive, true, waitScenario.deltaHours);

            // В конфликтном режиме часы простоя судна на рейде совпадают с waitScenario.deltaHours
            if (slotTimelineConflict.hasConflict) {
              const stuckEvent = slotTimelineConflict.vesselTrack.find((ev) => ev.id === 'vessel-stuck');
              expect(stuckEvent).toBeDefined();
              expect(stuckEvent?.hours).toBe(waitScenario.deltaHours);
            }

            // В синхронизированном режиме РЖД бар равен 3ч
            const rzdEvent = slotTimelineSynced.railTrack.find((ev) => ev.id === 'rail-departure');
            expect(rzdEvent).toBeDefined();
            expect(rzdEvent?.hours).toBe(3.0);
          });
        });
      });
    });
  });
});
