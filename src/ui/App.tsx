import React, { useState, useMemo } from 'react';
import { Header, ScenarioPresetMode } from './Header';
import { CaspianMap } from './CaspianMap';
import { HydroChart } from './HydroChart';
import { SyncSlotPanel } from './SyncSlotPanel';
import { DecisionMatrix } from './DecisionMatrix';
import { CargoCard } from './CargoCard';
import { PORTS } from '../data/ports';
import { INITIAL_VESSEL, INITIAL_CARGO } from '../data/vessels';
import { generateHydroTimeline, getInterpolatedHydroPoint } from '../domain/hydroProfile';
import { evaluateDecisionScenarios } from '../domain/scenarioDecision';

export const App: React.FC = () => {
  const [presetMode, setPresetMode] = useState<ScenarioPresetMode>('sgon');
  const [isSlotSynced, setIsSlotSynced] = useState(false);
  const [isPreCleared, setIsPreCleared] = useState(false);
  const [currentHour, setCurrentHour] = useState(20);

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
      // Экстремальные наносы 0.55 м по Минтрансу (глубина падает до 3.35 м)
      setVesselDraft(4.15);
      setSiltationMeters(0.55);
      setVesselEtaBarHour(20);
      setCurrentHour(20);
    }
  };

  const isCrisisActive = presetMode !== 'nominal';

  // Предиктивный гидрологический профиль на 72 часа
  const hydroForecast = useMemo(() => {
    return generateHydroTimeline(vesselDraft, isCrisisActive, vesselEtaBarHour, siltationMeters);
  }, [vesselDraft, isCrisisActive, vesselEtaBarHour, siltationMeters]);

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
        destination: 'Порт Махачкала (причал B-4, глубина 6.8 м) → СКЖД → Москва',
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
      />

      {/* Main Grid: Exact 100vh viewport fit, scroll ONLY inside right column */}
      <main className="flex-1 min-h-0 px-6 pb-4 pt-3 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden max-w-[1840px] w-full mx-auto">
        {/* Left Column: Fullscreen Map Canvas + Predictive Hydro Profile under map */}
        <section className="lg:col-span-7 h-full flex flex-col justify-between overflow-hidden">
          <div className="flex-1 min-h-[340px] w-full overflow-hidden">
            <CaspianMap
              ports={PORTS}
              vessel={vessel}
              isCrisisActive={isRiskState && !isSlotSynced}
              isSlotSynced={isSlotSynced}
              vkmskDepthMeters={currentHydroPoint.depthMeters}
            />
          </div>

          {/* Предиктивный график под картой с маркером ETA, P10-P90, автоплеем и селекторами */}
          <div className="shrink-0">
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
        <section className="lg:col-span-5 h-full overflow-y-auto pr-1.5 flex flex-col gap-4">
          {/* Панель «Решение» при риске: Крупный рекомендованный вариант + свернутые альтернативы */}
          <DecisionMatrix
            scenarios={scenarios}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={setSelectedScenarioId}
            onApplySyncSlot={handleSyncSlot}
            isSlotSynced={isSlotSynced}
            isSyncing={isSyncing}
          />

          {/* Карточка судна и гидро-радар */}
          <SyncSlotPanel
            vessel={vessel}
            vkmskDepthMeters={currentHydroPoint.depthMeters}
            isCrisisActive={isRiskState && !isSlotSynced}
            isSlotSynced={isSlotSynced}
            onSyncSlot={handleSyncSlot}
          />

          {/* Цифровой двойник партии груза (Pre-clearance + ESG) */}
          <CargoCard
            cargo={cargo}
            isPreCleared={isPreCleared}
            onPreClear={handlePreClear}
          />
        </section>
      </main>
    </div>
  );
};
