import { AiFallbackCheckRepository } from './ai-fallback-check.repository';

export const AiFallbackCheckService = {
  list() {
    return AiFallbackCheckRepository.list();
  },

  create(payload: { name: string; description?: string }) {
    return AiFallbackCheckRepository.create(payload);
  },
};