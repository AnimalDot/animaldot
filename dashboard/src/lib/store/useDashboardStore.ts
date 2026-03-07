import { create } from 'zustand';

interface DashboardState {
  selectedPetId: string | null;
  setSelectedPetId: (id: string | null) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedPetId: null,
  setSelectedPetId: (id) => set({ selectedPetId: id }),
}));
