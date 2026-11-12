import { VesselData, CargoManifest } from './types';

// MOCK: Вымышленное судно для тестирования (согласно разделу 6 AGENTS.md)
// СЮЖЕТ: Входящий рейс с юга Каспия в РФ (МТК «Север-Юг»)
// Маршрут: Порт Амирабад (Иран) -> Астрахань (ВКМСК) -> Москва (Терминал Демо-Север)
export const INITIAL_VESSEL: VesselData = {
  id: 'VESSEL-DEMO-01',
  name: 'MV Demo-01',
  type: 'Контейнеровоз река-море (тип Volgo-Max)',
  flag: 'RU',
  imo: '9900011',
  draftMeters: 4.15, // Осадка в полном грузу (Volgo-Max, до 6% флота)
  lengthMeters: 141.0,
  capacityTeu: 240,
  currentLoadTeu: 218,
  cargoType: 'Полиэтилен высокого давления и полимеры',
  cargoTonnage: 4360,
  origin: 'Порт Амирабад (Иран)',
  destination: 'Астрахань (ВКМСК) → Терминал Демо-Север (Москва)',
  // Судно находится на внешнем глубоководном рейде ВКМСК в открытом Каспийском море (км 188+)
  // Глубина здесь 9.5 м, путь свободен как для входа в канал на север, так и для маневра на юго-запад к Махачкале
  lat: 44.75,
  lon: 47.92,
  speedKnots: 10.2, // ~18.9 км/ч
  status: 'normal',
  provenance: 'synthetic',
};

// MOCK: Цифровой двойник партии груза
export const INITIAL_CARGO: CargoManifest = {
  manifestId: 'e-CMR-2026-DEMO-991',
  shipper: 'Demo Petrochemical Co. (Иран)',
  consignee: 'ООО «Полимер-Демо» / Терминал Демо-Север (Москва)',
  cargoDescription: 'Полиэтилен гранулированный (марка ПВД 15803-020)',
  hsCode: '3901 10 900 0',
  weightTons: 4360,
  eSealId: 'IoT-SEAL-DEMO-771',
  eSealStatus: 'intact',
  isPreCleared: false,
  provenance: 'synthetic',
};
