const memoryStore: Array<{ id: string; name: string; description?: string }> = [];

export const CliSmokeRepository = {
  list() {
    return memoryStore;
  },

  create(payload: { name: string; description?: string }) {
    const item = { id: String(Date.now()), ...payload };
    memoryStore.unshift(item);
    return item;
  },
};