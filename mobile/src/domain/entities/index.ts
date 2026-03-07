/**
 * Domain layer – core business entities.
 * Independent of frameworks and external concerns.
 */

export type {
  VitalSigns,
  EnvironmentData,
  WeightData,
  DeviceStatus,
  SensorReading,
  PetProfile,
  AnimalDotDevice,
  User,
  AppSettings,
  DataPoint,
  TrendData,
  DailySummary,
  VitalRanges,
  SpeciesClass,
} from '../../types';

export type { BLEConnectionState } from '../../types';
export {
  SPECIES_VITAL_RANGES,
  getVitalRangesForPet,
  NORMAL_RANGES,
} from '../../types';
