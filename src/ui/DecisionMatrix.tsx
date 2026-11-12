import React, { useState } from 'react';
import {
  Check,
  X,
  AlertTriangle,
  Zap,
  ArrowRight,
  ShieldCheck,
  Clock,
  DollarSign,
  Leaf,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { DecisionScenario } from '../domain/scenarioDecision';

interface DecisionMatrixProps {
  scenarios: DecisionScenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: 'wait' | 'makhachkala' | 'lighten') => void;
  onApplySyncSlot: () => void;
  isSlotSynced: boolean;
  isSyncing: boolean;
}

export const DecisionMatrix: React.FC<DecisionMatrixProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onApplySyncSlot,
  isSlotSynced,
  isSyncing,
}) => {
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);

  const toggleFormulas = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedScenarioId((prev) => (prev === id ? null : id));
  };

  const isPassOnly = scenarios.length === 1 && scenarios[0].id === 'pass';

  return (
    <div className="glass-panel rounded-panel p-5 flex flex-col gap-4 text-text select-none border border-hairline">
      {/* Title */}
      <div className="flex items-start justify-between border-b border-divider pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-inner bg-surface-2 border border-hairline flex items-center justify-center text-accent">
            <Zap className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-text">
                Панель поддержки решений логиста
              </span>
            </div>
            <p className="text-[11px] text-text-2 mt-0.5">
              Динамический выбор оптимального сценария на основе осадки, наносов и часа ETA
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 text-text-2 border border-hairline">
          {isPassOnly ? 'Штатно' : `${scenarios.length} альтернативы`}
        </span>
      </div>

      {/* Case 1: Pass without incident */}
      {isPassOnly && (
        <div className="p-4 rounded-inner border border-ok bg-ok-muted space-y-3">
          <div className="flex items-start gap-2.5 text-ok">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <div className="font-semibold text-xs text-text">
                {scenarios[0].title}
              </div>
              <p className="text-[11px] text-text-2 mt-0.5">
                {scenarios[0].subtitle}
              </p>
            </div>
          </div>

          <div className="space-y-1 bg-surface p-2.5 rounded border border-hairline text-[10px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-text-2">Осадка судна:</span>
              <span className="text-ok flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{scenarios[0].feasibility.draftDetail}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-2">Причал и кран:</span>
              <span className="text-ok flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{scenarios[0].feasibility.berthAndCraneDetail}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-2">Нитка РЖД:</span>
              <span className="text-ok flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{scenarios[0].feasibility.rzdSlotDetail}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-2">Локомотив:</span>
              <span className="text-ok flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{scenarios[0].feasibility.locomotiveDetail}</span>
              </span>
            </div>
          </div>

          <div className="p-2 rounded bg-surface border border-hairline text-[10px] font-mono text-text-2">
            Рекомендация: Судно проходит лимитирующий бар без задержек. Корректировка слотов не требуется.
          </div>
        </div>
      )}

      {/* Case 2: Risk occurs -> Alternative Scenarios */}
      {!isPassOnly && (
        <div className="flex flex-col gap-3">
          {scenarios.map((scenario) => {
            const isSelected = selectedScenarioId === scenario.id;
            const isMakhachkala = scenario.id === 'makhachkala';
            const isExpanded = expandedScenarioId === scenario.id;

            return (
              <div
                key={scenario.id}
                onClick={() => scenario.id !== 'pass' && onSelectScenario(scenario.id as 'wait' | 'makhachkala' | 'lighten')}
                className={`p-3.5 rounded-inner border transition-all cursor-pointer ${
                  scenario.isRecommended
                    ? 'border-accent bg-surface-2'
                    : isSelected
                    ? 'border-hairline bg-surface-2'
                    : 'border-hairline bg-surface hover:bg-surface-2'
                }`}
              >
                {/* Scenario Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-text">
                        {scenario.title}
                      </span>
                      {scenario.isRecommended && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-ok-muted border border-ok text-ok font-semibold">
                          Рекомендовано алгоритмом
                        </span>
                      )}
                      {!scenario.isFeasible && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-critical-muted border border-critical text-critical">
                          Нереализуемо
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-2 mt-0.5">
                      {scenario.subtitle}
                    </p>
                  </div>

                  {/* Button to open calculation breakdown */}
                  <button
                    onClick={(e) => toggleFormulas(scenario.id, e)}
                    className="px-2 py-1 rounded bg-surface border border-hairline text-[10px] text-text-2 hover:text-text flex items-center gap-1 transition-all cursor-pointer"
                    title="Показать математические формулы и исходные данные"
                  >
                    <HelpCircle className="w-3 h-3 text-accent" strokeWidth={1.5} />
                    <span>Формулы</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Delta Metrics Row: Δ время, Δ $, Δ CO2 */}
                <div className="grid grid-cols-3 gap-1.5 my-2.5 text-center text-[10px] font-mono">
                  <div className="bg-surface p-1.5 rounded border border-hairline flex flex-col items-center justify-center">
                    <span className="text-text-2 flex items-center gap-1 mb-0.5">
                      <Clock className="w-3 h-3 text-text-2" strokeWidth={1.5} />
                      Δ Время
                    </span>
                    <span
                      className={`font-semibold ${
                        scenario.deltaHours > 20 ? 'text-critical' : 'text-ok'
                      }`}
                    >
                      +{scenario.deltaHours} ч
                    </span>
                  </div>

                  <div className="bg-surface p-1.5 rounded border border-hairline flex flex-col items-center justify-center">
                    <span className="text-text-2 flex items-center gap-1 mb-0.5">
                      <DollarSign className="w-3 h-3 text-text-2" strokeWidth={1.5} />
                      Δ Затраты
                    </span>
                    <span
                      className={`font-semibold ${
                        scenario.deltaCostUsd > 20000 ? 'text-critical' : 'text-text'
                      }`}
                    >
                      +${scenario.deltaCostUsd.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-surface p-1.5 rounded border border-hairline flex flex-col items-center justify-center">
                    <span className="text-text-2 flex items-center gap-1 mb-0.5">
                      <Leaf className="w-3 h-3 text-text-2" strokeWidth={1.5} />
                      Δ CO2
                    </span>
                    <span className="font-semibold text-text">
                      +{scenario.deltaCo2Tons} т
                    </span>
                  </div>
                </div>

                {/* Expandable Box: Как считалось (формулы) */}
                {isExpanded && (
                  <div className="my-2.5 p-2.5 rounded bg-surface border border-accent text-[10px] font-mono space-y-1.5 text-text-2">
                    <div className="text-accent font-semibold flex items-center gap-1">
                      Математический расчёт параметров:
                    </div>
                    <div>
                      <span className="text-text">Время:</span> {scenario.calculationDetails.timeFormula}
                    </div>
                    <div>
                      <span className="text-text">Затраты:</span> {scenario.calculationDetails.costFormula}
                    </div>
                    <div>
                      <span className="text-text">Эмиссия:</span> {scenario.calculationDetails.co2Formula}
                    </div>
                    <div className="pt-1 border-t border-divider space-y-0.5 text-[9px]">
                      <span className="text-text-2 block">Допущения и нормативы:</span>
                      {scenario.calculationDetails.assumptions.map((a, idx) => (
                        <div key={idx}>· {a}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feasibility Checklist: 4 parameters with anonymized IDs */}
                <div className="space-y-1 bg-surface p-2 rounded border border-hairline text-[10px] font-mono">
                  {/* 1. Осадка */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-2">Осадка судна:</span>
                    <span
                      className={`flex items-center gap-1 ${
                        scenario.feasibility.draft ? 'text-ok' : 'text-critical'
                      }`}
                    >
                      {scenario.feasibility.draft ? (
                        <Check className="w-3 h-3" strokeWidth={2} />
                      ) : (
                        <X className="w-3 h-3" strokeWidth={2} />
                      )}
                      <span>{scenario.feasibility.draftDetail}</span>
                    </span>
                  </div>

                  {/* 2. Причал и кран */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-2">Причал и кран:</span>
                    <span
                      className={`flex items-center gap-1 ${
                        scenario.feasibility.berthAndCrane ? 'text-ok' : 'text-critical'
                      }`}
                    >
                      {scenario.feasibility.berthAndCrane ? (
                        <Check className="w-3 h-3" strokeWidth={2} />
                      ) : (
                        <X className="w-3 h-3" strokeWidth={2} />
                      )}
                      <span>{scenario.feasibility.berthAndCraneDetail}</span>
                    </span>
                  </div>

                  {/* 3. Нитка РЖД */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-2">Нитка РЖД:</span>
                    <span
                      className={`flex items-center gap-1 ${
                        scenario.feasibility.rzdSlot ? 'text-ok' : 'text-critical'
                      }`}
                    >
                      {scenario.feasibility.rzdSlot ? (
                        <Check className="w-3 h-3" strokeWidth={2} />
                      ) : (
                        <X className="w-3 h-3" strokeWidth={2} />
                      )}
                      <span>{scenario.feasibility.rzdSlotDetail}</span>
                    </span>
                  </div>

                  {/* 4. Локомотив */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-2">Локомотив:</span>
                    <span
                      className={`flex items-center gap-1 ${
                        scenario.feasibility.locomotive ? 'text-ok' : 'text-critical'
                      }`}
                    >
                      {scenario.feasibility.locomotive ? (
                        <Check className="w-3 h-3" strokeWidth={2} />
                      ) : (
                        <X className="w-3 h-3" strokeWidth={2} />
                      )}
                      <span>{scenario.feasibility.locomotiveDetail}</span>
                    </span>
                  </div>
                </div>

                {/* Rejection Reason or Action Button */}
                {scenario.rejectionReason && (
                  <div className="mt-2 p-2 rounded bg-surface border border-critical text-[10px] text-critical flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span>Причина отказа: {scenario.rejectionReason}</span>
                  </div>
                )}

                {/* Action Button for Makhachkala */}
                {isMakhachkala && !isSlotSynced && scenario.isRecommended && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplySyncSlot();
                    }}
                    disabled={isSyncing}
                    className="mt-2.5 w-full py-2 px-3 rounded-inner bg-accent hover:opacity-90 active:opacity-100 text-text font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Применить Caspian Sync-Slot (Махачкала)</span>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                )}

                {isMakhachkala && isSlotSynced && (
                  <div className="mt-2 p-2 rounded bg-ok-muted border border-ok text-ok text-[11px] font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Сценарий активирован: судно и состав РЖД перенаправлены в Махачкалу</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
