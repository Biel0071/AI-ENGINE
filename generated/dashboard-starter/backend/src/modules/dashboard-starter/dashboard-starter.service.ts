import { DashboardStarterRepository } from './dashboard-starter.repository';

export const DashboardStarterService = {
  list() {
    return DashboardStarterRepository.list();
  },

  create(payload: { name: string; description?: string }) {
    return DashboardStarterRepository.create(payload);
  },
};