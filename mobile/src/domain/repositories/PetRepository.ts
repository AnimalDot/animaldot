/**
 * Domain layer – repository interfaces.
 */

import type { PetProfile } from '../entities';

export interface IPetRepository {
  getPets(userId: string): Promise<PetProfile[]>;
  getActivePetId(userId: string): Promise<string | null>;
  savePets(userId: string, pets: PetProfile[], activePetId: string | null): Promise<void>;
  addPet(pet: PetProfile): Promise<void>;
  updatePet(id: string, updates: Partial<PetProfile>): Promise<void>;
  removePet(id: string): Promise<void>;
}
