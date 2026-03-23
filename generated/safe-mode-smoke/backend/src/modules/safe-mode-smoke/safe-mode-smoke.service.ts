import { SafeModeSmokeRepository } from './safe-mode-smoke.repository';

export const SafeModeSmokeService = {
  list() {
    return SafeModeSmokeRepository.list();
  },

  create(payload: { name: string; description?: string }) {
    return SafeModeSmokeRepository.create(payload);
  },
};