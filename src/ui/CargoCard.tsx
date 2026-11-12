import React, { useState, useEffect } from 'react';
import { FileText, ShieldCheck, Check, Cpu, Leaf } from 'lucide-react';
import { CargoManifest } from '../data/types';
import { compareRouteEsg, EsgComparisonResult } from '../domain/esgCalculator';
import { generatePreClearanceHash } from '../domain/preClearance';
import { CASPIAN_ASSUMPTIONS } from '../data/assumptions';

interface CargoCardProps {
  cargo: CargoManifest;
  isPreCleared: boolean;
  onPreClear: () => void;
  isSlotSynced?: boolean;
}

export const CargoCard: React.FC<CargoCardProps> = ({
  cargo,
  isPreCleared,
  onPreClear,
  isSlotSynced = false,
}) => {
  const [ledgerHash, setLedgerHash] = useState<string>('');
  const [isHashing, setIsHashing] = useState<boolean>(false);

  const hoursWithout = Number(CASPIAN_ASSUMPTIONS.preClearanceProcessingHoursWithout?.value || 48);
  const hoursWith = Number(CASPIAN_ASSUMPTIONS.preClearanceProcessingHoursWith?.value || 1.5);

  const esg: EsgComparisonResult = compareRouteEsg(cargo.weightTons, isSlotSynced);

  useEffect(() => {
    generatePreClearanceHash(cargo).then(setLedgerHash);
  }, [cargo]);

  const handlePreClearClick = () => {
    setIsHashing(true);
    setTimeout(() => {
      setIsHashing(false);
      onPreClear();
    }, 600);
  };

  return (
    <div className="glass-panel rounded-panel p-4 flex flex-col gap-3 text-text select-none">
      {/* Manifest Header */}
      <div className="flex items-start justify-between border-b border-divider pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-inner bg-surface-2 border border-hairline flex items-center justify-center text-accent shrink-0">
            <FileText className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-text">
                Манифест {cargo.manifestId}
              </span>
            </div>
            <p className="text-xs text-text-2 mt-0.5">
              ТН ВЭД <span className="font-mono tabular-nums">{cargo.hsCode}</span> · <span className="font-mono tabular-nums">{cargo.weightTons}</span> т · {cargo.cargoDescription}
            </p>
          </div>
        </div>

        {/* Pre-clearance Pill */}
        <div className="px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 border border-hairline bg-surface-2 whitespace-nowrap shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isPreCleared ? 'bg-ok' : 'bg-warn'
            }`}
          />
          <span className="text-xs whitespace-nowrap">
            {isPreCleared ? 'Pre-cleared' : 'Ожидание'}
          </span>
        </div>
      </div>

      {/* Shipper & Consignee Row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-surface-2 p-2 rounded-inner border border-hairline">
          <span className="text-text-2 block text-xs mb-0.5">Отправитель</span>
          <span className="text-text font-medium text-xs truncate block">{cargo.shipper}</span>
        </div>
        <div className="bg-surface-2 p-2 rounded-inner border border-hairline">
          <span className="text-text-2 block text-xs mb-0.5">Получатель</span>
          <span className="text-text font-medium text-xs truncate block">{cargo.consignee}</span>
        </div>
      </div>

      {/* ESG Route Comparison Section */}
      <div className="p-3 rounded-inner bg-surface-2 border border-hairline space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-2 font-medium flex items-center gap-1.5 text-xs">
            <Leaf className="w-3.5 h-3.5 text-ok shrink-0" strokeWidth={1.5} />
            Углеродный след (GLEC / ISO 14083)
          </span>
          <span className="text-xs font-mono tabular-nums text-ok whitespace-nowrap font-semibold">
            -{esg.savingsPercent}% к авто
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-surface p-1.5 rounded-inner border border-hairline">
            <span className="text-xs text-text-2 block mb-0.5">Море+Ж/Д</span>
            <span className="font-mono text-sm text-text font-semibold tabular-nums">
              {(esg.multimodalCo2Kg / 1000).toFixed(1)} т
            </span>
          </div>

          <div className="bg-surface p-1.5 rounded-inner border border-hairline">
            <span className="text-xs text-text-2 block mb-0.5">Авто (2950 км)</span>
            <span className="font-mono text-sm text-text-2 tabular-nums">
              {(esg.roadAlternativeCo2Kg / 1000).toFixed(1)} т
            </span>
          </div>

          <div className="bg-surface p-1.5 rounded-inner border border-hairline">
            <span className="text-xs text-text-2 block mb-0.5">Экономия</span>
            <span className="font-mono text-sm text-ok font-semibold tabular-nums">
              +{esg.savingsVsRoadTons.toFixed(1)} т
            </span>
          </div>
        </div>
      </div>

      {/* Ledger-Ready Pre-clearance Section */}
      <div className="p-3 rounded-inner bg-surface-2 border border-hairline space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-2 font-medium flex items-center gap-1.5 text-xs">
            <Cpu className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.5} />
            Pre-clearance (Ledger-ready SHA-256)
          </span>
          <span className="text-xs text-text-2 whitespace-nowrap">
            Пломба: <span className="font-mono tabular-nums">{cargo.eSealId}</span>
          </span>
        </div>

        <div className="p-1.5 rounded bg-surface border border-hairline text-xs font-mono text-text-2 truncate">
          Хеш: {ledgerHash ? `${ledgerHash.slice(0, 24)}...` : 'генерация...'}
        </div>

        {!isPreCleared ? (
          <button
            onClick={handlePreClearClick}
            disabled={isHashing}
            className="w-full py-2 px-3 rounded-inner bg-surface hover:bg-divider border border-hairline text-text font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isHashing ? (
              <span className="text-text-2 font-mono">Верификация хеша...</span>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
                <span>Оформить Pre-clearance до прибытия</span>
              </>
            )}
          </button>
        ) : (
          <div className="p-2 rounded bg-ok-muted border border-ok text-ok text-xs font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span>Pre-cleared: срок оформления <span className="font-mono tabular-nums">{hoursWithout}</span> ч → <span className="font-mono tabular-nums">{hoursWith}</span> ч</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-2 text-text-2 border border-hairline whitespace-nowrap font-normal">
              Допущение
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
