import React, { useState } from 'react';
import { Header } from './Header';
import { CaspianMap } from './CaspianMap';
import { SyncSlotPanel } from './SyncSlotPanel';
import { CargoCard } from './CargoCard';
import { PORTS } from '../data/ports';
import { INITIAL_VESSEL, INITIAL_CARGO } from '../data/vessels';
import { CASPIAN_ASSUMPTIONS } from '../data/assumptions';

export const App: React.FC = () => {
  const [isCrisisActive, setIsCrisisActive] = useState(false);
  const [isSlotSynced, setIsSlotSynced] = useState(false);
  const [isPreCleared, setIsPreCleared] = useState(false);

  const [vkmskDepthMeters, setVkmskDepthMeters] = useState(
    Number(CASPIAN_ASSUMPTIONS.vkmskNominalDepth.value)
  );
  const [windSpeedMs, setWindSpeedMs] = useState(4.2);
  const [vessel, setVessel] = useState(INITIAL_VESSEL);
  const [cargo, setCargo] = useState(INITIAL_CARGO);

  // Toggle sgon wind crisis simulation in VKMSK
  const handleToggleCrisis = () => {
    if (!isCrisisActive) {
      setIsCrisisActive(true);
      setIsSlotSynced(false);
      setVkmskDepthMeters(3.85); // Critical shallowing
      setWindSpeedMs(14.8);
      setVessel((prev) => ({
        ...prev,
        status: 'risk',
      }));
    } else {
      handleReset();
    }
  };

  // Execute Tripartite Sync-Slot
  const handleSyncSlot = () => {
    setIsSlotSynced(true);
    setVessel((prev) => ({
      ...prev,
      status: 'rerouted',
      destination: 'Порт Махачкала (причал №4) -> Иран',
    }));
  };

  // Reset to default nominal schedule
  const handleReset = () => {
    setIsCrisisActive(false);
    setIsSlotSynced(false);
    setIsPreCleared(false);
    setVkmskDepthMeters(Number(CASPIAN_ASSUMPTIONS.vkmskNominalDepth.value));
    setWindSpeedMs(4.2);
    setVessel(INITIAL_VESSEL);
    setCargo(INITIAL_CARGO);
  };

  const handlePreClear = () => {
    setIsPreCleared(true);
    setCargo((prev) => ({
      ...prev,
      isPreCleared: true,
    }));
  };

  return (
    <div className="min-h-screen bg-base text-text flex flex-col font-sans select-none">
      {/* Top Floating Header */}
      <Header
        vkmskDepthMeters={vkmskDepthMeters}
        windSpeedMs={windSpeedMs}
        isCrisisActive={isCrisisActive}
        isSlotSynced={isSlotSynced}
        onToggleCrisis={handleToggleCrisis}
        onReset={handleReset}
      />

      {/* Main Grid: Fullscreen Map (7 cols) + Right Panels (5 cols) */}
      <main className="flex-1 pt-20 pb-6 px-6 max-w-[1780px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Fullscreen Map Canvas */}
        <section className="lg:col-span-7 flex flex-col h-[calc(100vh-104px)] min-h-[580px]">
          <CaspianMap
            ports={PORTS}
            vessel={vessel}
            isCrisisActive={isCrisisActive}
            isSlotSynced={isSlotSynced}
            vkmskDepthMeters={vkmskDepthMeters}
          />
        </section>

        {/* Right Inspector & Cargo Cards */}
        <section className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-104px)] pr-1">
          <SyncSlotPanel
            vessel={vessel}
            vkmskDepthMeters={vkmskDepthMeters}
            isCrisisActive={isCrisisActive}
            isSlotSynced={isSlotSynced}
            onSyncSlot={handleSyncSlot}
          />

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
