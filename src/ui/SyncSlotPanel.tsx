import React, { useState } from 'react';
import {
  Ship,
  Train,
  Anchor,
  AlertTriangle,
  Check,
  Zap,
  ArrowRight,
  Info
} from 'lucide-react';
import { VesselData } from '../data/types';
import { calculateUnderkeelClearance } from '../domain/underkeelClearance';
import { evaluateTripartiteSyncSlot, TripartiteSyncPlan } from '../domain/syncSlot';
import { compareRouteEsg } from '../domain/esgCalculator';

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
  const effectiveDepth = isSlotSynced ? 6.8 : vkmskDepthMeters;
  const ukc = calculateUnderkeelClearance(effectiveDepth, vessel.draftMeters);
  const esg = compareRouteEsg(vessel.cargoTonnage);

  const syncPlan: TripartiteSyncPlan = evaluateTripartiteSyncSlot(
    isCrisisActive && !isSlotSynced,
    vessel.status === 'risk' ? 38.0 : 0.0
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
              <span className="text-[10px] font-mono text-text-2 bg-surface-2 px-1.5 py-0.5 rounded border border-hairline">
                {vessel.flag}
              </span>
            </div>
            <p className="text-[11px] text-text-2 font-mono mt-0.5">
              Входящий рейс · IMO {vessel.imo} · {vessel.currentLoadTeu}/{vessel.capacityTeu} TEU · Осадка {vessel.draftMeters.toFixed(2)} м
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border border-hairline bg-surface-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSlotSynced ? 'bg-ok' : isCrisisActive ? 'bg-critical' : 'bg-warn'
            }`}
          />
          <span className="text-[11px] font-mono">
            {isSlotSynced
              ? 'Слот активен (+2.65 м)'
              : isCrisisActive
              ? 'Риск мели (-0.60 м)'
              : 'Запас +0.25 м (порог 0.5 м)'}
          </span>
        </div>
      </div>

      {/* Hydro-Draft Radar Block */}
      <div
        className={`p-3.5 rounded-inner border transition-all ${
          isCrisisActive && !isSlotSynced
            ? 'bg-critical-muted border-critical'
            : isSlotSynced
            ? 'bg-ok-muted border-ok'
            : 'bg-surface-2 border-hairline'
        }`}
      >
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-text-2 font-medium flex items-center gap-1.5">
            <Anchor className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
            Запас под килем (UKC)
          </span>
          <span
            className={`text-[11px] font-mono font-semibold tabular-nums ${
              isSlotSynced ? 'text-ok' : isCrisisActive ? 'text-critical' : 'text-warn'
            }`}
          >
            {ukc.actualClearanceMeters >= 0 ? '+' : ''}
            {ukc.actualClearanceMeters.toFixed(2)} м
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-surface p-2.5 rounded-inner border border-hairline">
            <span className="text-text-2 block text-[10px] mb-0.5">Осадка судна (факт)</span>
            <span className="text-sm font-mono font-semibold tabular-nums text-text">
              {vessel.draftMeters.toFixed(2)} м
            </span>
          </div>

          <div className="bg-surface p-2.5 rounded-inner border border-hairline">
            <span className="text-text-2 block text-[10px] mb-0.5">
              {isSlotSynced ? 'Глубина причала (Махачкала)' : 'Глубина бара (151–155 км)'}
            </span>
            <span
              className={`text-sm font-mono font-semibold tabular-nums ${
                isCrisisActive && !isSlotSynced ? 'text-critical' : isSlotSynced ? 'text-ok' : 'text-text'
              }`}
            >
              {effectiveDepth.toFixed(2)} м {!isSlotSynced && <span className="text-[10px] text-text-2 font-normal">(цель 4.50)</span>}
            </span>
          </div>
        </div>

        {/* Informational threshold label */}
        {!isCrisisActive && !isSlotSynced && (
          <div className="mt-2.5 p-2 rounded bg-surface border border-hairline text-[11px] text-text-2 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-warn shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>
              Порог безопасного запаса: 0.50 м (допущение). Текущий клиренс 0.25 м находится в зоне повышенного контроля.
            </span>
          </div>
        )}

        {isCrisisActive && !isSlotSynced && (
          <div className="mt-2.5 p-2 rounded bg-surface border border-critical text-[11px] text-critical flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>
              Осадка {vessel.draftMeters.toFixed(2)} м превышает глубину бара {vkmskDepthMeters.toFixed(2)} м (дефицит 0.60 м). Подход в T+20ч приведёт к посадке на мель.
            </span>
          </div>
        )}
      </div>

      {/* Metrics Row: Calculated Deltas */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-inner bg-surface-2 border border-hairline">
          <span className="text-[10px] text-text-2 block mb-0.5">Δ Время в пути</span>
          <span
            className={`font-mono font-semibold tabular-nums ${
              isSlotSynced ? 'text-ok' : isCrisisActive ? 'text-critical' : 'text-text'
            }`}
          >
            {isSlotSynced ? '+10.1 ч' : isCrisisActive ? '+38.0 ч' : '0.0 ч'}
          </span>
        </div>

        <div className="p-2.5 rounded-inner bg-surface-2 border border-hairline">
          <span className="text-[10px] text-text-2 block mb-0.5">Δ Доп. затраты</span>
          <span
            className={`font-mono font-semibold tabular-nums ${
              isSlotSynced ? 'text-ok' : isCrisisActive ? 'text-critical' : 'text-text'
            }`}
          >
            {isSlotSynced ? '+$16 400' : isCrisisActive ? '+$27 110' : '$0'}
          </span>
        </div>

        <div className="p-2.5 rounded-inner bg-surface-2 border border-hairline">
          <span className="text-[10px] text-text-2 block mb-0.5">CO2 экономия к авто</span>
          <span className="font-mono font-semibold tabular-nums text-ok">
            +{isSlotSynced ? '1015.3' : esg.savingsVsRoadTons.toFixed(1)} т
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
            Переход с внешнего рейда в глубоководный порт Махачкала (глубина {syncPlan.targetDepthMeters} м, причал №{syncPlan.targetBerthNumber}) + сквозная нитка СКЖД {syncPlan.rzdTimetableSlotNumber} до Москвы.
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
                3. Судно: курс изменен на Махачкалу (в обход ВКМСК)
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
            <div>РЖД: сквозная нитка СКЖД №2042 согласована до ст. Белый Раст (Москва)</div>
            <div>Порт: причал №4 (глубина 6.80 м, кран 32 т) готов к приёму 218 TEU</div>
            <div>Судно: курс изменён на Махачкалу по глубоководному морю в обход ВКМСК</div>
          </div>
        </div>
      )}
    </div>
  );
};
