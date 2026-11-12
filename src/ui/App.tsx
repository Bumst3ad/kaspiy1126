import React, { useState, useMemo } from 'react';
import { Header } from './Header';
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
  const [isCrisisActive, setIsCrisisActive] = useState(false);
  const [isSlotSynced, setIsSlotSynced] = useState(false);
  const [isPreCleared, setIsPreCleared] = useState(false);
  const [currentHour, setCurrentHour] = useState(0);

  // Интерактивные параметры реконструкции (осадка, наносы, ETA подхода на бар)
  const [vesselDraft, setVesselDraft] = useState(4.15); // 4.15 м (Volgo-Max) или 3.40 м (типичная)
  const [siltationMeters, setSiltationMeters] = useState(0.35); // Наносы после паводка по Минтрансу РФ (0.10 - 0.55 м)
  const [vesselEtaBarHour, setVesselEtaBarHour] = useState(20); // Плановый час подхода к бару: T+10ч, T+20ч, T+58ч

  const [selectedScenarioId, setSelectedScenarioId] = useState<'wait' | 'makhachkala' | 'lighten'>('makhachkala');
  const [isSyncing, setIsSyncing] = useState(false);

  const [cargo, setCargo] = useState(INITIAL_CARGO);

  // Предиктивный гидрологический профиль на 72 часа с учетом физики Минтранса РФ
  const hydroForecast = useMemo(() => {
    return generateHydroTimeline(vesselDraft, isCrisisActive, vesselEtaBarHour, siltationMeters);
  }, [vesselDraft, isCrisisActive, vesselEtaBarHour, siltationMeters]);

  // Интерполированная точка в выбранный час на таймлайне
  const currentHydroPoint = useMemo(() => {
    return getInterpolatedHydroPoint(hydroForecast, currentHour);
  }, [hydroForecast, currentHour]);

  // Оценка сценариев при риске на основе динамического алгоритма
  const scenarios = useMemo(() => {
    return evaluateDecisionScenarios(
      vesselDraft,
      hydroForecast.depthAtArrivalMeters,
      vesselEtaBarHour,
      hydroForecast.riskWindow.endHour
    );
  }, [vesselDraft, hydroForecast.depthAtArrivalMeters, vesselEtaBarHour, hydroForecast.riskWindow.endHour]);

  // Динамическое состояние судна, синхронизированное с входящим рейсом и осадкой
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

  // Переключение симуляции сгонного ветра в ВКМСК
  const handleToggleCrisis = () => {
    if (!isCrisisActive) {
      setIsCrisisActive(true);
      setIsSlotSynced(false);
      setCurrentHour(vesselEtaBarHour); // Перемещаем бегунок точно на час планового подхода к бару
    } else {
      handleReset();
    }
  };

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
    setIsCrisisActive(false);
    setIsSlotSynced(false);
    setIsPreCleared(false);
    setCurrentHour(0);
    setVesselDraft(4.15);
    setSiltationMeters(0.35);
    setVesselEtaBarHour(20);
    setSelectedScenarioId('makhachkala');
    setCargo(INITIAL_CARGO);
  };

  const handlePreClear = () => {
    setIsPreCleared(true);
    setCargo((prev) => ({
      ...prev,
      isPreCleared: true,
    }));
  };

  // Тревога зависит от того, активен ли кризис и попадает ли подход судна в окно риска
  const isRiskState = (isCrisisActive && hydroForecast.isEtaInRiskWindow) || currentHydroPoint.isRisk;

  return (
    <div className="min-h-screen bg-base text-text flex flex-col font-sans select-none">
      {/* Top Floating Header */}
      <Header
        vkmskDepthMeters={currentHydroPoint.depthMeters}
        windSpeedMs={currentHydroPoint.windSpeedMs}
        windRumb={currentHydroPoint.windRumb}
        isCrisisActive={isCrisisActive}
        isSlotSynced={isSlotSynced}
        onToggleCrisis={handleToggleCrisis}
        onReset={handleReset}
      />

      {/* Main Grid: Fullscreen Map + HydroChart (7 cols) and Right Panels (5 cols) */}
      <main className="flex-1 pt-20 pb-6 px-6 max-w-[1780px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Fullscreen Map Canvas + Predictive Hydro Profile under map */}
        <section className="lg:col-span-7 flex flex-col min-h-[580px]">
          <div className="h-[480px] w-full">
            <CaspianMap
              ports={PORTS}
              vessel={vessel}
              isCrisisActive={isRiskState && !isSlotSynced}
              isSlotSynced={isSlotSynced}
              vkmskDepthMeters={currentHydroPoint.depthMeters}
            />
          </div>

          {/* Предиктивный график под картой с маркером ETA, ползунком времени и селекторами */}
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
        </section>

        {/* Right Inspector & Cargo Cards */}
        <section className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-104px)] pr-1">
          {/* Панель «Решение» при риске: Динамическая рекомендация алгоритма */}
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
