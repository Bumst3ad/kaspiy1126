import { VesselData, CargoManifest } from './types';

// MOCK: Вымышленное судно для тестирования (согласно разделу 6 AGENTS.md)
export const INITIAL_VESSEL: VesselData = {
  id: 'VESSEL-DEMO-01',
  name: 'MV Demo-01',
  type: 'Контейнеровоз река-море (Volgo-Max)',
  flag: 'RU',
  imo: '9900011',
  draftMeters: 4.25, // Осадка в грузу
  lengthMeters: 141.0,
  capacityTeu: 240,
  currentLoadTeu: 218,
  cargoType: 'Агрохимикаты и полимеры',
  cargoTonnage: 4360,
  origin: 'Москва (терминал Белый Раст)',
  destination: 'Порт Энзели (Иран)',
  lat: 46.1200,
  lon: 48.0100,
  speedKnots: 10.2,
  status: 'normal',
  provenance: 'synthetic',
};

// MOCK: Цифровой двойник партии груза
export const INITIAL_CARGO: CargoManifest = {
  manifestId: 'e-CMR-2026-DEMO-991',
  shipper: 'ПАО АгроХим Волга',
  consignee: 'Caspian Petrochem Ltd',
  cargoDescription: 'Карбамид гранулированный, марка Б',
  hsCode: '3102 10 100 0',
  weightTons: 4360,
  eSealId: 'IoT-SEAL-DEMO-771',
  eSealStatus: 'intact',
  isPreCleared: false,
  provenance: 'synthetic',
};
