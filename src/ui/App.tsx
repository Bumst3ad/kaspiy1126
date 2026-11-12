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
  const [selectedScenarioId, setSelectedScenarioId] = useState<'wait' | 'makhachkala' | 'lighten'>('makhachkala');
  const [isSyncing, setIsSyncing] = useState(false);

  const [cargo, setCargo] = useState(INITIAL_CARGO);

  // Предиктивный гидрологический профиль на 72 часа
  const hydroForecast = useMemo(() => {
    return generateHydroTimeline(INITIAL_VESSEL.draftMeters, isCrisisActive);
  }, [isCrisisActive]);

  // Интерполированная точка в выбранный час на таймлайне
  const currentHydroPoint = useMemo(() => {
    return getInterpolatedHydroPoint(hydroForecast, currentHour);
  }, [hydroForecast, currentHour]);

  // Оценка сценариев при риске
  const scenarios = useMemo(() => {
    return evaluateDecisionScenarios(INITIAL_VESSEL.draftMeters, currentHydroPoint.depthMeters);
  }, [currentHydroPoint.depthMeters]);

  // Динамическое состояние судна, синхронизированное с бегунком времени
  const vessel = useMemo(() => {
    if (isSlotSynced) {
      return {
        ...INITIAL_VESSEL,
        status: 'rerouted' as const,
        destination: 'Порт Махачкала (причал №4, глубина 6.8 м) → Мумбаи (Индия)',
        lat: 43.40,
        lon: 47.60,
      };
    }

    const isRisk = currentHydroPoint.isRisk || (isCrisisActive && currentHour >= 12);
    return {
      ...INITIAL_VESSEL,
      status: isRisk ? ('risk' as const) : ('normal' as const),
      lat: currentHydroPoint.vesselLat,
      lon: currentHydroPoint.vesselLon,
    };
  }, [isSlotSynced, currentHydroPoint, isCrisisActive, currentHour]);

  // Переключение симуляции сгонного ветра в ВКМСК
  const handleToggleCrisis = () => {
    if (!isCrisisActive) {
      setIsCrisisActive(true);
      setIsSlotSynced(false);
      setCurrentHour(24); // Автоматически перемещаем бегунок в пик сгона (T+24ч)
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

  const isRiskState = currentHydroPoint.isRisk || isCrisisActive;

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

          {/* Предиктивный график под картой с ползунком времени */}
          <HydroChart
            profile={hydroForecast}
            currentPoint={currentHydroPoint}
            currentHour={currentHour}
            onHourChange={setCurrentHour}
            isSlotSynced={isSlotSynced}
          />
        </section>

        {/* Right Inspector & Cargo Cards */}
        <section className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-104px)] pr-1">
          {/* Панель «Решение» при риске: Ждать / Махачкала / Уменьшить загрузку */}
          {isRiskState && (
            <DecisionMatrix
              scenarios={scenarios}
              selectedScenarioId={selectedScenarioId}
              onSelectScenario={setSelectedScenarioId}
              onApplySyncSlot={handleSyncSlot}
              isSlotSynced={isSlotSynced}
              isSyncing={isSyncing}
            />
          )}

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
