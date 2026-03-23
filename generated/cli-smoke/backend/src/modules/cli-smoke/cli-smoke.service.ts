import { CliSmokeRepository } from './cli-smoke.repository';

export const CliSmokeService = {
  list() {
    return CliSmokeRepository.list();
  },

  create(payload: { name: string; description?: string }) {
    return CliSmokeRepository.create(payload);
  },
};