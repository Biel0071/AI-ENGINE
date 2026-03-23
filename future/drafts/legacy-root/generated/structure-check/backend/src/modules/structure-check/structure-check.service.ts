import { StructureCheckRepository } from './structure-check.repository';

export const StructureCheckService = {
  list() {
    return StructureCheckRepository.list();
  },

  create(payload: { name: string; description?: string }) {
    return StructureCheckRepository.create(payload);
  },
};