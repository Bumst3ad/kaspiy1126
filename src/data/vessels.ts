import { VesselData, CargoManifest } from './types';

// MOCK: Вымышленное судно для тестирования (согласно разделу 6 AGENTS.md)
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
  cargoType: 'Карбамид гранулированный (марка Б)',
  cargoTonnage: 4360,
  origin: 'Москва (терминал Белый Раст)',
  destination: 'Порт Энзели (терминал Каспиан, Иран) → Мумбаи (Индия)',
  lat: 45.45, // 138-й км ВКМСК на подходе к лимитирующему бару (не перекрывает Астрахань)
  lon: 47.65,
  speedKnots: 10.2,
  status: 'normal',
  provenance: 'synthetic',
};

// MOCK: Цифровой двойник партии груза
export const INITIAL_CARGO: CargoManifest = {
  manifestId: 'e-CMR-2026-DEMO-991',
  shipper: 'ПАО АгроХим Волга',
  consignee: 'Caspian Petrochem Ltd (Мумбаи)',
  cargoDescription: 'Карбамид гранулированный, марка Б',
  hsCode: '3102 10 100 0',
  weightTons: 4360,
  eSealId: 'IoT-SEAL-DEMO-771',
  eSealStatus: 'intact',
  isPreCleared: false,
  provenance: 'synthetic',
};
