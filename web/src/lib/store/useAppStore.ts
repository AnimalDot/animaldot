import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WeightUnit = 'lbs' | 'kg';
export type TempUnit = 'F' | 'C';

interface AppState {
  selectedPetId: string | null;
  setSelectedPetId: (id: string | null) => void;
  weightUnit: WeightUnit;
  tempUnit: TempUnit;
  setWeightUnit: (u: WeightUnit) => void;
  setTempUnit: (u: TempUnit) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void) => ({
      selectedPetId: null,
      setSelectedPetId: (id: string | null) => set({ selectedPetId: id }),
      weightUnit: 'lbs',
      tempUnit: 'F',
      setWeightUnit: (u: WeightUnit) => set({ weightUnit: u }),
      setTempUnit: (u: TempUnit) => set({ tempUnit: u }),
    }),
    { name: 'animaldot-web-units' }
  )
);
