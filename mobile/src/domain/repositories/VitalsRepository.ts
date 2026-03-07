/**
 * Domain layer – repository interfaces.
 * Implementations live in the data layer.
 */

import type { VitalSigns, DataPoint, DailySummary } from '../entities';

export interface IVitalsRepository {
  getLatestVitals(): Promise<VitalSigns | null>;
  getHeartRateHistory(hours: number): Promise<DataPoint[]>;
  getRespiratoryRateHistory(hours: number): Promise<DataPoint[]>;
  getDailySummaries(days: number): Promise<DailySummary[]>;
}
