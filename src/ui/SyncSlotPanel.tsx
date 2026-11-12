import React, { useState } from 'react';
import {
  Ship,
  Train,
  Anchor,
  AlertTriangle,
  Check,
  Zap,
  ArrowRight
} from 'lucide-react';
import { VesselData } from '../data/types';
import { calculateUnderkeelClearance } from '../domain/underkeelClearance';
import { evaluateTripartiteSyncSlot, TripartiteSyncPlan } from '../domain/syncSlot';

interface SyncSlotPanelProps {
  vessel: VesselData;
  vkmskDepthMeters: number;
  isCrisisActive: boolean;
  isSlotSynced: boolean;
  onSyncSlot: () => void;
}

export const SyncSlotPanel: React.FC<SyncSlotPanelProps> = ({
  vessel,
  vkmskDepthMeters,
  isCrisisActive,
  isSlotSynced,
  onSyncSlot,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState(0);

  // Pure domain calculations
  const ukc = calculateUnderkeelClearance(vkmskDepthMeters, vessel.draftMeters);
  const syncPlan: TripartiteSyncPlan = evaluateTripartiteSyncSlot(
    isCrisisActive && !isSlotSynced,
    vessel.status === 'risk' ? 72.0 : 0.0
  );

  const handleSyncClick = () => {
    setIsSyncing(true);
    setSyncStep(1); // РЖД
    setTimeout(() => {
      setSyncStep(2); // Порт
      setTimeout(() => {
        setSyncStep(3); // Судно
        setTimeout(() => {
          setIsSyncing(false);
          setSyncStep(0);
          onSyncSlot();
        }, 300);
      }, 300);
    }, 300);
  };

  return (
    <div className="glass-panel rounded-panel p-5 flex flex-col gap-4 text-text select-none">
      {/* Vessel Profile */}
      <div className="flex items-start justify-between border-b border-divider pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-inner bg-surface-2 border border-hairline flex items-center justify-center text-accent">
            <Ship className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-text">
                {vessel.name}
              </span>
              <span className="text-[10px] font-mono text-text-2 bg-surface-2 px-1.5 py-0.5 rounded">
                {vessel.flag}
              </span>
            </div>
            <p className="text-[11px] text-text-2 font-mono mt-0.5">
              IMO {vessel.imo} · {vessel.currentLoadTeu}/{vessel.capacityTeu} TEU · {vessel.cargoTonnage} т
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border border-hairline bg-surface-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSlotSynced ? 'bg-ok' : isCrisisActive ? 'bg-critical' : 'bg-ok'
            }`}
          />
          <span className="text-[11px]">
            {isSlotSynced ? 'Слот активен' : isCrisisActive ? 'Риск мели' : 'В графике'}
          </span>
        </div>
      </div>

      {/* Hydro-Draft Radar Block */}
      <div
        className={`p-3.5 rounded-inner border transition-all ${
          isCrisisActive && !isSlotSynced
            ? 'bg-critical-muted border-critical'
            : 'bg-surface-2 border-hairline'
        }`}
      >
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-text-2 font-medium flex items-center gap-1.5">
            <Anchor className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
            Запас под килем (UKC)
          </span>
          <span className="text-[11px] font-mono tabular-nums">
            {ukc.actualClearanceMeters >= 0 ? '+' : ''}
            {ukc.actualClearanceMeters.toFixed(2)} м
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-surface p-2.5 rounded-inner border border-hairline">
            <span className="text-text-2 block text-[10px] mb-0.5">Осадка судна</span>
            <span className="text-sm font-mono font-semibold tabular-nums text-text">
              {vessel.draftMeters.toFixed(2)} м
            </span>
          </div>

          <div className="bg-surface p-2.5 rounded-inner border border-hairline">
            <span className="text-text-2 block text-[10px] mb-0.5">Глубина канала</span>
            <span
              className={`text-sm font-mono font-semibold tabular-nums ${
                isCrisisActive && !isSlotSynced ? 'text-critical' : 'text-text'
              }`}
            >
              {vkmskDepthMeters.toFixed(2)} м
            </span>
          </div>
        </div>

        {isCrisisActive && !isSlotSynced && (
          <div className="mt-2.5 p-2 rounded bg-surface border border-critical text-[11px] text-critical flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>
              Осадка {vessel.draftMeters} м превышает глубину {vkmskDepthMeters} м. Риск посадки на мель в ВКМСК.
            </span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-inner bg-surface-2 border border-hairline">
          <span className="text-[10px] text-text-2 block mb-0.5">Задержка</span>
          <span
            className={`font-mono font-semibold tabular-nums ${
              isSlotSynced ? 'text-ok' : isCrisisActive ? 'text-critical' : 'text-text'
            }`}
          >
            {isSlotSynced ? '+1.5 ч' : isCrisisActive ? '+72.0 ч' : '0.0 ч'}
          </span>
        </div>

        <div className="p-2.5 rounded-inner bg-surface-2 border border-hairline">
          <span className="text-[10px] text-text-2 block mb-0.5">Демередж</span>
          <span
            className={`font-mono font-semibold tabular-nums ${
              isSlotSynced ? 'text-ok' : isCrisisActive ? 'text-critical' : 'text-text'
            }`}
          >
            {isSlotSynced ? '$0' : isCrisisActive ? '$45 000' : '$0'}
          </span>
        </div>

        <div className="p-2.5 rounded-inner bg-surface-2 border border-hairline">
          <span className="text-[10px] text-text-2 block mb-0.5">CO2 экономия</span>
          <span className="font-mono font-semibold tabular-nums text-ok">
            {isSlotSynced ? '18.4 т' : '1.2 т'}
          </span>
        </div>
      </div>

      {/* Tripartite Sync-Slot Action Button */}
      {isCrisisActive && !isSlotSynced && (
        <div className="p-3.5 rounded-inner bg-surface-2 border border-accent">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-accent flex items-center gap-1.5 uppercase font-mono">
              <Zap className="w-3 h-3 text-accent" strokeWidth={1.5} />
              Caspian Sync-Slot
            </span>
            <span className="text-[10px] text-text-2 font-mono">
              Переход: {syncPlan.targetPortName}
            </span>
          </div>

          <p className="text-[11px] text-text-2 mb-3 leading-relaxed">
            Перенаправление на глубоководный причал №{syncPlan.targetBerthNumber} (глубина {syncPlan.targetDepthMeters} м) + нитка РЖД {syncPlan.rzdTimetableSlotNumber}.
          </p>

          {isSyncing && (
            <div className="mb-2.5 space-y-1 text-[11px] font-mono">
              <div className={`flex items-center gap-1.5 ${syncStep >= 1 ? 'text-ok' : 'text-text-2'}`}>
                <Train className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>1. РЖД: нитка {syncPlan.rzdTimetableSlotNumber} до {syncPlan.rzdDestinationStation}</span>
              </div>
              <div className={syncStep >= 2 ? 'text-ok' : 'text-text-2'}>
                2. Порт: причал №{syncPlan.targetBerthNumber} зарезервирован
              </div>
              <div className={syncStep >= 3 ? 'text-ok' : 'text-text-2'}>
                3. Судно: курс обновлен
              </div>
            </div>
          )}

          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="w-full py-2.5 px-4 rounded-inner bg-accent hover:opacity-90 active:opacity-100 text-text font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Синхронизировать слот (РЖД / Порт / Судно)</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Confirmation Box */}
      {isSlotSynced && (
        <div className="p-3 rounded-inner bg-ok-muted border border-ok text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-ok font-medium">
            <Check className="w-4 h-4" strokeWidth={1.5} />
            <span>Трёхсторонний слот подтверждён:</span>
          </div>
          <div className="text-[11px] text-text-2 pl-6 space-y-0.5 font-mono">
            <div>РЖД: нитка графика перенаправлена на ст. Махачкала-Порт</div>
            <div>Порт: причал №4 (глубина 6.8 м) выделен под разгрузку</div>
            <div>Судно: курс обновлен в обход ВКМСК</div>
          </div>
        </div>
      )}
    </div>
  );
};
