import { BillingSuiteRepository } from './billing-suite.repository';

export const BillingSuiteService = {
  list() {
    return BillingSuiteRepository.list();
  },

  create(payload: { name: string; description?: string }) {
    return BillingSuiteRepository.create(payload);
  },
};