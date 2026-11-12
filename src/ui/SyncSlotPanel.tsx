import React from 'react';
import {
  Ship,
  Anchor,
  AlertTriangle,
  Check,
  Info,
  Layers,
  Train
} from 'lucide-react';
import { VesselData } from '../data/types';
import { SYNC_SLOT_CONFIG } from '../domain/syncSlot';
import { DecisionScenario } from '../domain/scenarioDecision';
import { calculateSlotTimeline } from '../domain/slotSync';

interface SyncSlotPanelProps {
  vessel: VesselData;
  vkmskDepthMeters: number;
  isSlotSynced: boolean;
  isCrisisActive?: boolean;
  waitScenario: DecisionScenario;
  selectedScenario: DecisionScenario;
}

export const SyncSlotPanel: React.FC<SyncSlotPanelProps> = ({
  vessel,
  vkmskDepthMeters,
  isSlotSynced,
  isCrisisActive = false,
  waitScenario,
  selectedScenario,
}) => {
  // Pure domain calculations
  const effectiveDepth = isSlotSynced ? SYNC_SLOT_CONFIG.targetDepthMeters : vkmskDepthMeters;
  const actualClearance = Number((effectiveDepth - vessel.draftMeters).toFixed(2));

  const isCritical = actualClearance < 0;
  const isWarn = !isCritical && actualClearance < 0.5;
  const isOk = !isCritical && !isWarn;

  // Расчет трехдорожечной синхронизации (Судно | Порт | РЖД) с единым временем ожидания waitScenario.deltaHours
  const slotTimeline = calculateSlotTimeline(isCrisisActive || isCritical, isSlotSynced, waitScenario.deltaHours);

  return (
    <div className="glass-panel rounded-panel p-4 flex flex-col gap-3 text-text select-none border border-hairline">
      {/* Vessel Profile */}
      <div className="flex items-start justify-between border-b border-divider pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-inner bg-surface-2 border border-hairline flex items-center justify-center text-accent shrink-0">
            <Ship className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs tracking-tight text-text">
                {vessel.name}
              </span>
              <span className="text-[10px] font-mono text-text-2 bg-surface-2 px-1.5 py-0.5 rounded border border-hairline">
                {vessel.flag}
              </span>
            </div>
            <p className="text-[10px] text-text-2 font-mono mt-0.5">
              Входящий рейс · IMO {vessel.imo} · {vessel.currentLoadTeu}/{vessel.capacityTeu} TEU · Осадка {vessel.draftMeters.toFixed(2)} м
            </p>
          </div>
        </div>

        {/* Status Pill: Короткий текст без переноса строк */}
        <div className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 border border-hairline bg-surface-2 whitespace-nowrap shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isSlotSynced ? 'bg-ok' : isCritical ? 'bg-critical' : isWarn ? 'bg-warn' : 'bg-ok'
            }`}
          />
          <span className="text-[11px] whitespace-nowrap">
            {isSlotSynced
              ? 'Слот активен'
              : isCritical
              ? `Мель ${actualClearance >= 0 ? '+' : ''}${actualClearance.toFixed(2)} м`
              : isWarn
              ? `Контроль +${actualClearance.toFixed(2)} м`
              : `Запас +${actualClearance.toFixed(2)} м`}
          </span>
        </div>
      </div>

      {/* Hydro-Draft Radar Block */}
      <div
        className={`p-3 rounded-inner border transition-all ${
          isSlotSynced
            ? 'bg-ok-muted border-ok'
            : isCritical
            ? 'bg-critical-muted border-critical'
            : isWarn
            ? 'bg-warn-muted border-warn'
            : 'bg-surface-2 border-hairline'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="text-text-2 font-medium flex items-center gap-1.5 text-xs">
            <Anchor className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.5} />
            Запас под килем (UKC)
          </span>
          <span
            className={`text-xl font-mono font-bold tabular-nums ${
              isSlotSynced
                ? 'text-ok'
                : isCritical
                ? 'text-critical'
                : isWarn
                ? 'text-warn'
                : 'text-ok'
            }`}
          >
            {actualClearance >= 0 ? '+' : ''}
            {actualClearance.toFixed(2)} м
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-surface p-2.5 rounded-inner border border-hairline">
            <span className="text-text-2 block text-xs mb-0.5">Осадка судна (факт)</span>
            <span className="text-xl font-mono font-bold tabular-nums text-text">
              {vessel.draftMeters.toFixed(2)} м
            </span>
          </div>

          <div className="bg-surface p-2.5 rounded-inner border border-hairline">
            <span className="text-text-2 block text-xs mb-0.5">
              {isSlotSynced ? 'Причал (Махачкала)' : 'Глубина бара (151–155 км)'}
            </span>
            <span
              className={`text-xl font-mono font-bold tabular-nums ${
                isSlotSynced ? 'text-ok' : isCritical ? 'text-critical' : isWarn ? 'text-warn' : 'text-text'
              }`}
            >
              {effectiveDepth.toFixed(2)} м {!isSlotSynced && <span className="text-xs text-text-2 font-normal">(цель 4.50)</span>}
            </span>
          </div>
        </div>

        {/* Informational threshold label */}
        {isOk && !isSlotSynced && (
          <div className="mt-2 p-1.5 rounded bg-surface border border-hairline text-[10px] text-text-2 flex items-start gap-1.5">
            <Check className="w-3 h-3 text-ok shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>
              Порог безопасного запаса: 0.50 м (допущение). Текущий клиренс +{actualClearance.toFixed(2)} м в норме.
            </span>
          </div>
        )}

        {isWarn && !isSlotSynced && (
          <div className="mt-2 p-1.5 rounded bg-surface border border-warn text-[10px] text-warn flex items-start gap-1.5">
            <Info className="w-3 h-3 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>
              Порог безопасного запаса: 0.50 м (допущение). Текущий клиренс +{actualClearance.toFixed(2)} м — проход под контролем.
            </span>
          </div>
        )}

        {isCritical && !isSlotSynced && (
          <div className="mt-2 p-1.5 rounded bg-surface border border-critical text-[10px] text-critical flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>
              Осадка {vessel.draftMeters.toFixed(2)} м превышает глубину бара {vkmskDepthMeters.toFixed(2)} м (дефицит {Math.abs(actualClearance).toFixed(2)} м). Риск мели!
            </span>
          </div>
        )}
      </div>

      {/* Metrics Row: Deltas comparing "Если ничего не делать" vs "С выбранным решением" */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-inner bg-surface-2 border border-hairline">
          <span className="text-[10px] text-text-2 block mb-0.5 whitespace-nowrap">Если ничего не делать</span>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-2">Δ Время:</span>
            <span className={`font-mono tabular-nums font-semibold ${waitScenario.deltaHours > 0 ? 'text-critical' : 'text-text'}`}>
              +{waitScenario.deltaHours} ч
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5 text-[11px]">
            <span className="text-text-2">Δ Затраты:</span>
            <span className={`font-mono tabular-nums font-semibold ${waitScenario.deltaCostUsd > 0 ? 'text-critical' : 'text-text'}`}>
              +${waitScenario.deltaCostUsd.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-2 rounded-inner bg-surface-2 border border-hairline">
          <span className="text-[10px] text-text-2 block mb-0.5 whitespace-nowrap">С выбранным решением</span>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-2">Δ Время:</span>
            <span className="font-mono tabular-nums font-semibold text-ok">
              +{selectedScenario.deltaHours} ч
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5 text-[11px]">
            <span className="text-text-2">Δ Затраты:</span>
            <span className="font-mono tabular-nums font-semibold text-ok">
              +${selectedScenario.deltaCostUsd.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* НОВЫЙ БЛОК: Синхронизация слота — 3 дорожки (Судно | Порт | РЖД) на общей оси времени */}
      <div className="p-3 rounded-inner bg-surface-2 border border-hairline space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
            <span className="font-medium text-text text-[11px]">
              Синхронизация слота (РЖД ⇄ Порт ⇄ Судно)
            </span>
          </div>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
              slotTimeline.isSynced
                ? 'bg-ok-muted border border-ok text-ok'
                : slotTimeline.hasConflict
                ? 'bg-critical-muted border border-critical text-critical'
                : 'bg-surface border border-hairline text-text-2'
            }`}
          >
            {slotTimeline.isSynced ? 'Синхронизировано' : slotTimeline.hasConflict ? 'Конфликт графиков' : 'Штатно'}
          </span>
        </div>

        {/* Временная шкала 3 дорожек */}
        <div className="relative pt-1 pb-1 space-y-1.5 bg-surface p-2 rounded border border-hairline">
          {/* Time axis header */}
          <div className="flex justify-between text-[9px] text-text-2 font-mono tabular-nums border-b border-divider pb-0.5">
            <span>T+0ч</span>
            <span>T+12ч</span>
            <span>T+24ч</span>
            <span>T+36ч</span>
            <span>T+48ч</span>
            <span>T+60ч</span>
          </div>

          {/* Track 1: Судно */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-11 text-text-2 font-medium shrink-0 flex items-center gap-1">
              <Ship className="w-2.5 h-2.5" /> Судно
            </span>
            <div className="relative flex-1 h-5 bg-surface-2 rounded overflow-hidden">
              {slotTimeline.vesselTrack.map((ev) => {
                const left = (ev.startHour / 60) * 100;
                const width = Math.max(6, ((ev.endHour - ev.startHour) / 60) * 100);
                return (
                  <React.Fragment key={ev.id}>
                    <div
                      style={{ left: `${left}%`, width: `${width}%` }}
                      className={`absolute top-0 bottom-0 rounded px-1 flex items-center justify-center text-[9px] font-mono font-bold tabular-nums transition-all duration-500 ease-out cursor-help ${
                        ev.status === 'conflict'
                          ? 'bg-critical-muted border border-critical text-critical'
                          : 'bg-accent-muted border border-accent text-accent'
                      }`}
                      title={`${ev.partyLabel}: ${ev.actionLabel} (${ev.hours}ч) — ${ev.detail}`}
                    >
                      <span>{ev.hours}ч</span>
                    </div>
                    {ev.bufferAfterHours && (
                      <div
                        style={{
                          left: `${(ev.endHour / 60) * 100}%`,
                          width: `${(ev.bufferAfterHours / 60) * 100}%`,
                        }}
                        className="absolute top-0 bottom-0 border-y border-r border-dashed border-ok/80 bg-ok/20 rounded-r flex items-center justify-center text-[8px] font-mono text-ok font-semibold"
                        title={`Технологический буфер: +${ev.bufferAfterHours}ч`}
                      >
                        +{ev.bufferAfterHours}ч
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Track 2: Порт */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-11 text-text-2 font-medium shrink-0 flex items-center gap-1">
              <Anchor className="w-2.5 h-2.5" /> Порт
            </span>
            <div className="relative flex-1 h-5 bg-surface-2 rounded overflow-hidden">
              {slotTimeline.portTrack.map((ev) => {
                const left = (ev.startHour / 60) * 100;
                const width = Math.max(6, ((ev.endHour - ev.startHour) / 60) * 100);
                return (
                  <React.Fragment key={ev.id}>
                    <div
                      style={{ left: `${left}%`, width: `${width}%` }}
                      className={`absolute top-0 bottom-0 rounded px-1 flex items-center justify-center text-[9px] font-mono font-bold tabular-nums transition-all duration-500 ease-out cursor-help ${
                        ev.status === 'conflict'
                          ? 'bg-critical-muted border border-critical text-critical'
                          : 'bg-ok-muted border border-ok text-ok'
                      }`}
                      title={`${ev.partyLabel}: ${ev.actionLabel} (${ev.hours}ч) — ${ev.detail}`}
                    >
                      <span>{ev.hours}ч</span>
                    </div>
                    {ev.bufferAfterHours && (
                      <div
                        style={{
                          left: `${(ev.endHour / 60) * 100}%`,
                          width: `${(ev.bufferAfterHours / 60) * 100}%`,
                        }}
                        className="absolute top-0 bottom-0 border-y border-r border-dashed border-ok/80 bg-ok/20 rounded-r flex items-center justify-center text-[8px] font-mono text-ok font-semibold"
                        title={`Технологический буфер: +${ev.bufferAfterHours}ч`}
                      >
                        +{ev.bufferAfterHours}ч
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Track 3: РЖД */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-11 text-text-2 font-medium shrink-0 flex items-center gap-1">
              <Train className="w-2.5 h-2.5" /> РЖД
            </span>
            <div className="relative flex-1 h-5 bg-surface-2 rounded overflow-hidden">
              {slotTimeline.railTrack.map((ev) => {
                const left = (ev.startHour / 60) * 100;
                const width = Math.max(6, ((ev.endHour - ev.startHour) / 60) * 100);
                return (
                  <div
                    key={ev.id}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    className={`absolute top-0 bottom-0 rounded px-1 flex items-center justify-center text-[9px] font-mono font-bold tabular-nums transition-all duration-500 ease-out cursor-help ${
                      ev.status === 'conflict'
                        ? 'bg-critical-muted border border-critical text-critical'
                        : 'bg-ok-muted border border-ok text-ok'
                    }`}
                    title={`${ev.partyLabel}: ${ev.actionLabel} (${ev.hours}ч) — ${ev.detail}`}
                  >
                    <span>{ev.hours}ч</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Компактная легенда под барами */}
        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-divider text-[9px] text-text-2">
          <div className="truncate" title="Судно: подход и швартовка">
            <span className="text-text font-medium">Судно:</span> {isSlotSynced ? 'Переход 11.5ч' : isCritical ? `Простой ${waitScenario.deltaHours}ч` : 'Ход 20ч'}
          </div>
          <div className="truncate" title="Порт: выгрузка 218 TEU кран KR-2">
            <span className="text-text font-medium">Порт:</span> {isSlotSynced ? 'Кран KR-2 8ч' : isCritical ? 'Срыв причала' : 'Причал 8ч'}
          </div>
          <div className="truncate" title="РЖД: подача тяги LOC-41 и нитка A-17">
            <span className="text-text font-medium">РЖД:</span> {isSlotSynced ? 'Нитка A-17 3ч' : isCritical ? 'Срыв нитки' : 'Нитка 3.5ч'}
          </div>
        </div>

        {/* Buffers and Status description: 2 строки, не обрезается */}
        <div className="flex flex-col gap-0.5 text-[10px] text-text-2 pt-1 border-t border-divider">
          <div className="text-text font-medium leading-tight">
            {slotTimeline.statusSummary}
          </div>
          {slotTimeline.isSynced && (
            <div className="text-ok font-mono font-semibold text-[10px]">
              Согласованные буферы: судно ⇄ причал (+{slotTimeline.portBufferHours}ч), кран ⇄ поезд (+{slotTimeline.railBufferHours}ч)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
