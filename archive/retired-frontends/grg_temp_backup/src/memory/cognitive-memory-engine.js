/**
 * FÊNIX Cognitive Memory Engine
 * 6-Layer Cognitive Memory: Working, Long-Term, Project, Conversation, Architecture & Mission Memory
 */
class CognitiveMemoryEngine {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.layers = {
      workingMemory: new Map(), // L0 — Active context
      longTermMemory: new Map(), // L1 — Deep vector & persistent patterns
      projectMemory: new Map(), // L2 — Repository genome & file structure
      conversationMemory: new Map(), // L3 — Dialogue history & preferences
      architectureMemory: new Map(), // L4 — System contracts & design ADRs
      missionMemory: new Map(), // L5 — Mission execution DNA logs
    };
  }

  setWorkingMemory(key, value) {
    this.layers.workingMemory.set(key, { value, updatedAt: new Date().toISOString() });
  }

  getWorkingMemory(key) {
    const entry = this.layers.workingMemory.get(key);
    return entry ? entry.value : null;
  }

  recordMissionMemory(missionId, payload) {
    this.layers.missionMemory.set(missionId, { payload, recordedAt: new Date().toISOString() });
    if (this.eventBus) {
      this.eventBus.emit('memory.layer.updated', { layer: 'missionMemory', key: missionId });
    }
  }

  recordArchitectureMemory(adrId, document) {
    this.layers.architectureMemory.set(adrId, { document, recordedAt: new Date().toISOString() });
  }

  getMemorySnapshot() {
    return {
      workingMemoryCount: this.layers.workingMemory.size,
      longTermMemoryCount: this.layers.longTermMemory.size,
      projectMemoryCount: this.layers.projectMemory.size,
      conversationMemoryCount: this.layers.conversationMemory.size,
      architectureMemoryCount: this.layers.architectureMemory.size,
      missionMemoryCount: this.layers.missionMemory.size,
    };
  }
}

module.exports = { CognitiveMemoryEngine };
