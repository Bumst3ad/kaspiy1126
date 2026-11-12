import React, { useState } from 'react';
import {
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  Clock,
  DollarSign,
  Leaf,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle2,
  Anchor
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
  onApplySyncSlot,
  isSlotSynced,
  isSyncing,
}) => {
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedScenarioId((prev) => (prev === id ? null : id));
  };

  const isPassOnly = scenarios.length === 1 && scenarios[0].id === 'pass';

  // Рекомендованный сценарий выносим на первое место
  const recommendedScenario = scenarios.find((s) => s.isRecommended) || scenarios[0];
  const secondaryScenarios = scenarios.filter((s) => s !== recommendedScenario);

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
            <p className="text-xs text-text-2 mt-0.5">
              Динамический выбор оптимального сценария на основе осадки, наносов и часа ETA
            </p>
          </div>
        </div>

        <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-2 text-text-2 border border-hairline">
          {isPassOnly ? 'Штатно' : `${scenarios.length} альтернативы`}
        </span>
      </div>

      {/* Case 1: Pass without incident */}
      {isPassOnly && (
        <div className="p-4 rounded-inner border border-ok bg-ok-muted space-y-3">
          <div className="flex items-start gap-2.5 text-ok">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <div className="font-semibold text-sm text-text">
                {scenarios[0].title}
              </div>
              <p className="text-xs text-text-2 mt-0.5">
                {scenarios[0].subtitle}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 bg-surface p-3 rounded-inner border border-hairline text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-2">Осадка судна:</span>
              <span className="text-ok flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>{scenarios[0].feasibility.draftDetail}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-2">Причал и кран:</span>
              <span className="text-ok flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>{scenarios[0].feasibility.berthAndCraneDetail}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-2">Нитка РЖД:</span>
              <span className="text-ok flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>{scenarios[0].feasibility.rzdSlotDetail}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-2">Локомотив:</span>
              <span className="text-ok flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>{scenarios[0].feasibility.locomotiveDetail}</span>
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-surface border border-hairline text-xs text-text-2 leading-relaxed">
            Рекомендация: Судно проходит лимитирующий бар без задержек. Вмешательства диспетчера не требуется.
          </div>
        </div>
      )}

      {/* Case 2: Risk occurs -> Recommended Large Card + Collapsed Alternatives */}
      {!isPassOnly && (
        <div className="flex flex-col gap-3">
          {/* 1. КРУПНЫЙ ПЕРВЫЙ РЕКОМЕНДОВАННЫЙ ВАРИАНТ */}
          <div className="p-4 rounded-inner border-2 border-accent bg-surface-2 shadow-lg space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-text">
                    {recommendedScenario.title}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-ok-muted border border-ok text-ok">
                    Рекомендовано алгоритмом
                  </span>
                </div>
                <p className="text-xs text-text-2 mt-1 leading-relaxed">
                  {recommendedScenario.subtitle}
                </p>
              </div>

              <button
                onClick={() => toggleExpand(recommendedScenario.id)}
                className="px-2.5 py-1 rounded bg-surface border border-hairline text-xs text-text-2 hover:text-text flex items-center gap-1 transition-all cursor-pointer"
                title="Формулы расчёта"
              >
                <HelpCircle className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
                <span>Формулы</span>
                {expandedScenarioId === recommendedScenario.id ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Delta Metrics Row */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-surface p-2 rounded-inner border border-hairline flex flex-col items-center justify-center">
                <span className="text-text-2 flex items-center gap-1 mb-1 text-[11px]">
                  <Clock className="w-3 h-3 text-text-2" strokeWidth={1.5} />
                  Δ Время
                </span>
                <span className="font-semibold text-text font-mono tabular-nums text-sm">
                  +{recommendedScenario.deltaHours} ч
                </span>
              </div>

              <div className="bg-surface p-2 rounded-inner border border-hairline flex flex-col items-center justify-center">
                <span className="text-text-2 flex items-center gap-1 mb-1 text-[11px]">
                  <DollarSign className="w-3 h-3 text-text-2" strokeWidth={1.5} />
                  Δ Затраты
                </span>
                <span className="font-semibold text-text font-mono tabular-nums text-sm">
                  +${recommendedScenario.deltaCostUsd.toLocaleString()}
                </span>
              </div>

              <div className="bg-surface p-2 rounded-inner border border-hairline flex flex-col items-center justify-center">
                <span className="text-text-2 flex items-center gap-1 mb-1 text-[11px]">
                  <Leaf className="w-3 h-3 text-text-2" strokeWidth={1.5} />
                  Δ CO2
                </span>
                <span className="font-semibold text-text font-mono tabular-nums text-sm">
                  +{recommendedScenario.deltaCo2Tons} т
                </span>
              </div>
            </div>

            {/* Expandable Formulas Box */}
            {expandedScenarioId === recommendedScenario.id && (
              <div className="p-3 rounded bg-surface border border-accent text-xs space-y-1.5 text-text-2">
                <div className="text-accent font-semibold flex items-center gap-1">
                  Математический расчёт параметров:
                </div>
                <div>
                  <span className="text-text">Время:</span> {recommendedScenario.calculationDetails.timeFormula}
                </div>
                <div>
                  <span className="text-text">Затраты:</span> {recommendedScenario.calculationDetails.costFormula}
                </div>
                <div>
                  <span className="text-text">Эмиссия:</span> {recommendedScenario.calculationDetails.co2Formula}
                </div>
              </div>
            )}

            {/* 4-Item Checklist */}
            <div className="space-y-1.5 bg-surface p-2.5 rounded-inner border border-hairline text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-2">Осадка судна:</span>
                <span className="text-ok flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{recommendedScenario.feasibility.draftDetail}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-2">Причал и кран:</span>
                <span className="text-ok flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{recommendedScenario.feasibility.berthAndCraneDetail}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-2">Нитка РЖД:</span>
                <span className="text-ok flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{recommendedScenario.feasibility.rzdSlotDetail}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-2">Локомотив:</span>
                <span className="text-ok flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{recommendedScenario.feasibility.locomotiveDetail}</span>
                </span>
              </div>
            </div>

            {/* Action Button for Recommended Option */}
            {recommendedScenario.id === 'makhachkala' && !isSlotSynced && (
              <button
                onClick={onApplySyncSlot}
                disabled={isSyncing}
                className="w-full py-2.5 px-4 rounded-inner bg-accent hover:opacity-90 active:opacity-100 text-text font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4" strokeWidth={1.5} />
                <span>Применить Caspian Sync-Slot (Махачкала)</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}

            {recommendedScenario.id === 'wait' && (
              <div className="p-2.5 rounded bg-ok-muted border border-ok text-ok text-xs font-medium flex items-center gap-2">
                <Anchor className="w-4 h-4" strokeWidth={1.5} />
                <span>Подтверждена кратковременная стоянка на внешнем рейде до T+54ч</span>
              </div>
            )}

            {isSlotSynced && (
              <div className="p-2.5 rounded bg-ok-muted border border-ok text-ok text-xs font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                <span>Сценарий активирован: судно и состав РЖД перенаправлены в Махачкалу</span>
              </div>
            )}
          </div>

          {/* 2. НЕРЕАЛИЗУЕМЫЕ И ВТОРОСТЕПЕННЫЕ ВАРИАНТЫ (СВЕРНУТЫ В ОДНУ СТРОКУ) */}
          <div className="space-y-2 pt-1">
            <span className="text-xs text-text-2 block px-1">
              Альтернативные варианты:
            </span>

            {secondaryScenarios.map((scenario) => {
              const isExpanded = expandedScenarioId === scenario.id;

              return (
                <div
                  key={scenario.id}
                  className="rounded-inner border border-hairline bg-surface hover:bg-surface-2 transition-all overflow-hidden"
                >
                  {/* Collapsed One-Line Row */}
                  <div
                    onClick={() => toggleExpand(scenario.id)}
                    className="p-3 flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-medium text-text">
                        {scenario.title}
                      </span>
                      <span className="text-text-2 font-mono tabular-nums text-[11px]">
                        +{scenario.deltaHours} ч · +${scenario.deltaCostUsd.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {scenario.rejectionReason ? (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-critical-muted border border-critical text-critical font-medium">
                          {scenario.id === 'wait' ? 'Отказ: срыв слота >6 ч' : 'Отказ: нет плавкрана'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-surface-2 border border-hairline text-text-2">
                          Менее выгодно
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-text-2" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-text-2" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-3 border-t border-hairline bg-surface-2 text-xs space-y-2">
                      <p className="text-text-2 leading-relaxed">
                        {scenario.subtitle}
                      </p>
                      {scenario.rejectionReason && (
                        <div className="p-2 rounded bg-surface border border-critical text-critical text-xs">
                          {scenario.rejectionReason}
                        </div>
                      )}
                      <div className="space-y-1 bg-surface p-2 rounded text-xs text-text-2">
                        <div className="flex justify-between">
                          <span>Осадка:</span>
                          <span className={scenario.feasibility.draft ? 'text-ok' : 'text-critical'}>
                            {scenario.feasibility.draftDetail}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Причал и кран:</span>
                          <span className={scenario.feasibility.berthAndCrane ? 'text-ok' : 'text-critical'}>
                            {scenario.feasibility.berthAndCraneDetail}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Нитка РЖД:</span>
                          <span className={scenario.feasibility.rzdSlot ? 'text-ok' : 'text-critical'}>
                            {scenario.feasibility.rzdSlotDetail}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Локомотив:</span>
                          <span className={scenario.feasibility.locomotive ? 'text-ok' : 'text-critical'}>
                            {scenario.feasibility.locomotiveDetail}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
