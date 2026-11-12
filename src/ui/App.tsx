import React, { useState, useMemo, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Header, ScenarioPresetMode, ViewRole } from './Header';
import { CaspianMap } from './CaspianMap';
import { HydroChart } from './HydroChart';
import { SyncSlotPanel } from './SyncSlotPanel';
import { DecisionMatrix } from './DecisionMatrix';
import { CargoCard } from './CargoCard';
import { DemoPanel } from './DemoPanel';
import { PORTS } from '../data/ports';
import { INITIAL_VESSEL, INITIAL_CARGO } from '../data/vessels';
import {
  generateHydroTimeline,
  getInterpolatedHydroPoint,
  calculateGroundingProbability,
} from '../domain/hydroProfile';
import { evaluateDecisionScenarios } from '../domain/scenarioDecision';
import { CASPIAN_ASSUMPTIONS } from '../data/assumptions';

export const App: React.FC = () => {
  const [viewRole, setViewRole] = useState<ViewRole>('demo');
  const [presetMode, setPresetMode] = useState<ScenarioPresetMode>('sgon');
  const [isSlotSynced, setIsSlotSynced] = useState(false);
  const [isPreCleared, setIsPreCleared] = useState(false);
  const [currentHour, setCurrentHour] = useState(20);

  // Клавиша D для быстрого переключения Демо | Диспетчер
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        setViewRole((prev) => (prev === 'demo' ? 'dispatcher' : 'demo'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Интерактивные параметры реконструкции
  const [vesselDraft, setVesselDraft] = useState(4.15); // 4.15 м (Volgo-Max) или 3.40 м (типичная)
  const [siltationMeters, setSiltationMeters] = useState(0.35); // Наносы после паводка по Минтрансу РФ
  const [vesselEtaBarHour, setVesselEtaBarHour] = useState(20); // Час подхода к бару: T+10ч, T+20ч, T+58ч

  const [selectedScenarioId, setSelectedScenarioId] = useState<'wait' | 'makhachkala' | 'lighten'>('makhachkala');
  const [isSyncing, setIsSyncing] = useState(false);

  const [cargo, setCargo] = useState(INITIAL_CARGO);

  // Обработка переключения режимов сценария: Штатно | Сгон | Июнь 2026
  const handleSelectPresetMode = (mode: ScenarioPresetMode) => {
    setPresetMode(mode);
    setIsSlotSynced(false);

    if (mode === 'nominal') {
      setVesselDraft(4.15);
      setSiltationMeters(0.20);
      setVesselEtaBarHour(20);
      setCurrentHour(0);
    } else if (mode === 'sgon') {
      setVesselDraft(4.15);
      setSiltationMeters(0.35);
      setVesselEtaBarHour(20);
      setCurrentHour(20);
    } else if (mode === 'june2026') {
      // Экстремальные наносы 0.55 м по Минтрансу (глубина падает до 3.38 м, осадка 3.40 м)
      setVesselDraft(3.40);
      setSiltationMeters(0.55);
      setVesselEtaBarHour(20);
      setCurrentHour(20);
    }
  };

  const isJuneMode = presetMode === 'june2026';
  const isCrisisActive = presetMode !== 'nominal';

  // Предиктивный гидрологический профиль на 72 часа
  const hydroForecast = useMemo(() => {
    return generateHydroTimeline(vesselDraft, isCrisisActive, vesselEtaBarHour, siltationMeters, isJuneMode);
  }, [vesselDraft, isCrisisActive, vesselEtaBarHour, siltationMeters, isJuneMode]);

  // Интерполированная точка в выбранный час на таймлайне
  const currentHydroPoint = useMemo(() => {
    return getInterpolatedHydroPoint(hydroForecast, currentHour);
  }, [hydroForecast, currentHour]);

  // Оценка сценариев при риске
  const scenarios = useMemo(() => {
    return evaluateDecisionScenarios(
      vesselDraft,
      hydroForecast.depthAtArrivalMeters,
      vesselEtaBarHour,
      hydroForecast.riskWindow.endHour
    );
  }, [vesselDraft, hydroForecast.depthAtArrivalMeters, vesselEtaBarHour, hydroForecast.riskWindow.endHour]);

  // Динамическое состояние судна
  const vessel = useMemo(() => {
    if (isSlotSynced) {
      return {
        ...INITIAL_VESSEL,
        draftMeters: vesselDraft,
        status: 'rerouted' as const,
        destination: 'Порт Махачкала (причал B-4, глубина 6.8 м) → РЖД → Москва',
        lat: 43.60,
        lon: 47.65,
      };
    }

    const isRisk = currentHydroPoint.isRisk || (isCrisisActive && currentHour >= 12);
    return {
      ...INITIAL_VESSEL,
      draftMeters: vesselDraft,
      status: isRisk ? ('risk' as const) : ('normal' as const),
      lat: currentHydroPoint.vesselLat,
      lon: currentHydroPoint.vesselLon,
    };
  }, [isSlotSynced, vesselDraft, currentHydroPoint, isCrisisActive, currentHour]);

  // Выбор сценариев для карточки судна
  const waitScenario = scenarios.find((s) => s.id === 'wait') || scenarios[0];
  const activeScenario =
    scenarios.find((s) => s.id === selectedScenarioId) ||
    scenarios.find((s) => s.isRecommended) ||
    scenarios[0];

  // Выполнение синхронизации слота (Caspian Sync-Slot)
  const handleSyncSlot = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setIsSlotSynced(true);
      setSelectedScenarioId('makhachkala');
    }, 600);
  };

  // Сброс к базовому состоянию
  const handleReset = () => {
    handleSelectPresetMode('nominal');
    setCargo(INITIAL_CARGO);
  };

  const handlePreClear = () => {
    setIsPreCleared(true);
    setCargo((prev) => ({
      ...prev,
      isPreCleared: true,
    }));
  };

  const isRiskState = (isCrisisActive && hydroForecast.isEtaInRiskWindow) || currentHydroPoint.isRisk;

  // Расчет вероятности риска мели по модели нормального приближения P10-P90
  const groundingProbability = useMemo(() => {
    const point = hydroForecast.timeline.find((t) => t.hour === vesselEtaBarHour) || currentHydroPoint;
    return calculateGroundingProbability(
      vesselDraft,
      hydroForecast.depthAtArrivalMeters,
      point.p10DepthMeters,
      point.p90DepthMeters
    );
  }, [vesselDraft, hydroForecast, vesselEtaBarHour, currentHydroPoint]);

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-base text-text flex flex-col font-sans select-none">
      {/* Top Fixed Header (h-16, shrink-0, zero page overlap) */}
      <Header
        vkmskDepthMeters={currentHydroPoint.depthMeters}
        windSpeedMs={currentHydroPoint.windSpeedMs}
        windRumb={currentHydroPoint.windRumb}
        presetMode={presetMode}
        onSelectPresetMode={handleSelectPresetMode}
        isSlotSynced={isSlotSynced}
        onReset={handleReset}
        viewRole={viewRole}
        onSelectViewRole={setViewRole}
      />

      {/* Исторический баннер реконструкции «Июнь 2026» */}
      {isJuneMode && (
        <div className="shrink-0 px-6 pt-2 max-w-[1840px] w-full mx-auto">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-surface border border-hairline text-xs text-text-2">
            <Info className="w-3.5 h-3.5 shrink-0 text-accent" strokeWidth={1.5} />
            <span className="flex-1">
              Реконструкция по открытым данным: закрытие 151–155 км{' '}
              <strong className="text-text font-medium">{String(CASPIAN_ASSUMPTIONS.june2026ClosureDates?.value || '10–12 и с 19 июня 2026')}</strong>
              , глубина ≈
              <strong className="text-text font-medium">{String(CASPIAN_ASSUMPTIONS.june2026CrisisReconstruction?.value || '3.38 м')}</strong>
              , в очереди ≈
              <strong className="text-text font-medium">{String(CASPIAN_ASSUMPTIONS.june2026VesselQueue?.value || '50')} судов</strong>{' '}
              ({CASPIAN_ASSUMPTIONS.june2026CrisisReconstruction?.source || 'Минтранс РФ, Интерфакс'}). Остальное — симуляция.
            </span>
            <span className="shrink-0 px-1.5 py-0.5 rounded border border-hairline text-[10px] text-text-2 font-mono">
              Архив 2026
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: Exact 100vh viewport fit, scroll ONLY inside right column */}
      <main className="flex-1 min-h-0 px-6 pb-3 pt-2 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden max-w-[1840px] w-full mx-auto">
        {/* Left Column: Grid: Map minmax(260px, 1fr) + Timeline Auto */}
        <section className="lg:col-span-7 h-full grid grid-rows-[minmax(260px,1fr)_auto] gap-3 overflow-hidden min-h-0">
          <div className="w-full h-full min-h-0 overflow-hidden">
            <CaspianMap
              ports={PORTS}
              vessel={vessel}
              isCrisisActive={isRiskState && !isSlotSynced}
              isSlotSynced={isSlotSynced}
              vkmskDepthMeters={currentHydroPoint.depthMeters}
            />
          </div>

          {/* Предиктивный график под картой с маркером ETA, P10-P90, автоплеем и селекторами */}
          <div className="w-full shrink-0 min-h-0">
            <HydroChart
              profile={hydroForecast}
              currentPoint={currentHydroPoint}
              currentHour={currentHour}
              onHourChange={setCurrentHour}
              vesselDraft={vesselDraft}
              onVesselDraftChange={setVesselDraft}
              siltationMeters={siltationMeters}
              onSiltationChange={setSiltationMeters}
              vesselEtaBarHour={vesselEtaBarHour}
              onEtaHourChange={setVesselEtaBarHour}
              isSlotSynced={isSlotSynced}
            />
          </div>
        </section>

        {/* Right Inspector & Cargo Cards: Скролл ТОЛЬКО внутри этой колонки */}
        <section className="lg:col-span-5 h-full overflow-y-auto pr-1 flex flex-col gap-3 min-h-0">
          {viewRole === 'demo' ? (
            <DemoPanel
              vessel={vessel}
              cargo={cargo}
              scenarios={scenarios}
              recommendedScenario={activeScenario}
              waitScenario={waitScenario}
              isSlotSynced={isSlotSynced}
              isSyncing={isSyncing}
              isCrisisActive={isRiskState}
              onApplySyncSlot={handleSyncSlot}
              vkmskDepthMeters={currentHydroPoint.depthMeters}
              currentHour={currentHour}
              groundingProbability={groundingProbability}
              isPreCleared={isPreCleared}
              onPreClear={handlePreClear}
            />
          ) : (
            <>
              {/* Панель «Решение» при риске: Крупный рекомендованный вариант + свернутые альтернативы */}
              <DecisionMatrix
                scenarios={scenarios}
                selectedScenarioId={selectedScenarioId}
                onSelectScenario={setSelectedScenarioId}
                onApplySyncSlot={handleSyncSlot}
                isSlotSynced={isSlotSynced}
                isSyncing={isSyncing}
              />

              {/* Карточка судна и гидро-радар (без дублирующей кнопки Sync-Slot) */}
              <SyncSlotPanel
                vessel={vessel}
                vkmskDepthMeters={currentHydroPoint.depthMeters}
                isSlotSynced={isSlotSynced}
                isCrisisActive={isRiskState && !isSlotSynced}
                waitScenario={waitScenario}
                selectedScenario={activeScenario}
              />

              {/* Цифровой двойник партии груза (Pre-clearance + ESG) */}
              <CargoCard
                cargo={cargo}
                isPreCleared={isPreCleared}
                onPreClear={handlePreClear}
                isSlotSynced={isSlotSynced}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
};
