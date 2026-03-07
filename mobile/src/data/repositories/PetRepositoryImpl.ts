/**
 * Data layer – implementation of IPetRepository using AsyncStorage.
 */

import type { IPetRepository } from '../../domain/repositories';
import type { PetProfile } from '../../domain/entities';
import { loadPetsForUser, savePetsForUser, usePetStore } from '../../services/store';

export class PetRepositoryImpl implements IPetRepository {
  async getPets(userId: string): Promise<PetProfile[]> {
    const { pets } = await loadPetsForUser(userId);
    return pets;
  }

  async getActivePetId(userId: string): Promise<string | null> {
    const { activePetId } = await loadPetsForUser(userId);
    return activePetId;
  }

  async savePets(userId: string, pets: PetProfile[], activePetId: string | null): Promise<void> {
    await savePetsForUser(userId, pets, activePetId);
  }

  async addPet(pet: PetProfile): Promise<void> {
    usePetStore.getState().addPet(pet);
  }

  async updatePet(id: string, updates: Partial<PetProfile>): Promise<void> {
    usePetStore.getState().updatePet(id, updates);
  }

  async removePet(id: string): Promise<void> {
    usePetStore.getState().removePet(id);
  }
}
