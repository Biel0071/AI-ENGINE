/**
 * FÊNIX OS — GLOBAL SELECTION STORE (SINGLE SOURCE OF TRUTH)
 * ==========================================================
 * Conforme Seções 3, 14, 23, 24, 25, 26 e 27 da Constituição Fênix:
 * - Apenas UMA fonte de verdade para seleção em toda a aplicação.
 * - Ao iniciar: selectedEntity = null (nenhum default hardcoded como 'deposito-mais').
 * - Tipos suportados: NONE, COMPANY, AGENT, PROJECT, MISSION, SYSTEM, WORLD_ENTITY.
 * - Despacha eventos padronizados no EventBus / window.
 */
(function() {
  'use strict';

  class GlobalSelectionStore {
    constructor() {
      this._state = {
        selectedEntity: null, // { type, id, data }
        selectedCompany: null,
        selectedProject: null,
        selectedAgent: null,
        selectedMission: null,
        selectedSystem: null,
        selectedWorldEntity: null
      };
      this._listeners = new Set();
    }

    get state() {
      return { ...this._state };
    }

    get selectedEntity() {
      return this._state.selectedEntity;
    }

    get selectedCompany() {
      return this._state.selectedCompany;
    }

    get selectedProject() {
      return this._state.selectedProject;
    }

    get selectedAgent() {
      return this._state.selectedAgent;
    }

    get selectedMission() {
      return this._state.selectedMission;
    }

    get selectedSystem() {
      return this._state.selectedSystem;
    }

    get selectedWorldEntity() {
      return this._state.selectedWorldEntity;
    }

    /**
     * Seleciona uma entidade globalmente
     * @param {'none'|'company'|'project'|'agent'|'mission'|'system'|'world_entity'} type
     * @param {string} id
     * @param {object} [data]
     */
    select(type, id, data = null) {
      if (!type || type === 'none') {
        return this.clearSelection();
      }

      const normalizedType = String(type).toLowerCase();
      const previous = this._state.selectedEntity;

      // 1. Limpa o estado anterior
      this._cleanupPrevious(normalizedType);

      // 2. Define nova seleção
      const entity = {
        type: normalizedType,
        id: String(id),
        data: data || {}
      };

      this._state.selectedEntity = entity;

      if (normalizedType === 'company') this._state.selectedCompany = { id, ...data };
      else if (normalizedType === 'project') this._state.selectedProject = { id, ...data };
      else if (normalizedType === 'agent') this._state.selectedAgent = { id, ...data };
      else if (normalizedType === 'mission') this._state.selectedMission = { id, ...data };
      else if (normalizedType === 'system') this._state.selectedSystem = { id, ...data };
      else if (normalizedType === 'world_entity') this._state.selectedWorldEntity = { id, ...data };

      // 3. Emite eventos no barramento
      this._emitEvents(normalizedType, id, entity);

      // 4. Notifica inscritos
      this._notify();

      return entity;
    }

    _cleanupPrevious(newType) {
      const prev = this._state.selectedEntity;
      if (!prev) return;

      if (prev.type === 'company' && newType !== 'company') {
        this._state.selectedCompany = null;
        this._dispatchCustomEvent('company:cleared', { previousId: prev.id });
      }
      if (prev.type === 'project' && newType !== 'project') {
        this._state.selectedProject = null;
        this._dispatchCustomEvent('project:cleared', { previousId: prev.id });
      }
      if (prev.type === 'agent' && newType !== 'agent') {
        this._state.selectedAgent = null;
        this._dispatchCustomEvent('agent:cleared', { previousId: prev.id });
      }
      if (prev.type === 'mission' && newType !== 'mission') {
        this._state.selectedMission = null;
        this._dispatchCustomEvent('mission:cleared', { previousId: prev.id });
      }
      if (prev.type === 'system' && newType !== 'system') {
        this._state.selectedSystem = null;
      }
      if (prev.type === 'world_entity' && newType !== 'world_entity') {
        this._state.selectedWorldEntity = null;
      }
    }

    _emitEvents(type, id, entity) {
      this._dispatchCustomEvent('selection:changed', entity);

      if (type === 'company') this._dispatchCustomEvent('company:selected', { companyId: id, company: entity.data });
      if (type === 'project') this._dispatchCustomEvent('project:selected', { projectId: id, project: entity.data });
      if (type === 'agent') this._dispatchCustomEvent('agent:selected', { agentId: id, agent: entity.data });
      if (type === 'mission') this._dispatchCustomEvent('mission:selected', { missionId: id, mission: entity.data });

      // Atualização universal do contexto do Copilot
      this._dispatchCustomEvent('copilot:context-changed', {
        contextType: type.toUpperCase(),
        contextId: id,
        details: entity.data
      });
    }

    _dispatchCustomEvent(eventName, detail) {
      try {
        const target = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : null);
        if (target && typeof target.dispatchEvent === 'function') {
          const Ev = typeof CustomEvent !== 'undefined' ? CustomEvent : (typeof target.CustomEvent !== 'undefined' ? target.CustomEvent : null);
          if (Ev) target.dispatchEvent(new Ev(eventName, { detail }));
        }
      } catch (_) {}
    }

    clearSelection() {
      const prev = this._state.selectedEntity;
      this._state.selectedEntity = null;
      this._state.selectedCompany = null;
      this._state.selectedProject = null;
      this._state.selectedAgent = null;
      this._state.selectedMission = null;
      this._state.selectedSystem = null;
      this._state.selectedWorldEntity = null;

      if (prev) {
        if (prev.type === 'company') this._dispatchCustomEvent('company:cleared', { previousId: prev.id });
        if (prev.type === 'project') this._dispatchCustomEvent('project:cleared', { previousId: prev.id });
        if (prev.type === 'agent') this._dispatchCustomEvent('agent:cleared', { previousId: prev.id });
        if (prev.type === 'mission') this._dispatchCustomEvent('mission:cleared', { previousId: prev.id });
      }

      this._dispatchCustomEvent('selection:changed', null);
      this._dispatchCustomEvent('copilot:context-changed', {
        contextType: 'GLOBAL',
        contextId: null,
        details: null
      });

      this._notify();
    }

    subscribe(listener) {
      if (typeof listener === 'function') {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
      }
      return () => {};
    }

    _notify() {
      for (const listener of this._listeners) {
        try {
          listener(this.state);
        } catch (e) {
          console.error('[GlobalSelectionStore] Listener error:', e);
        }
      }
    }
  }

  const storeInstance = new GlobalSelectionStore();

  if (typeof window !== 'undefined') {
    window.GlobalSelectionStore = storeInstance;
    window.__FENIX_SINGLETONS__?.register('globalSelectionStore', storeInstance);

    // Bridge functions para compatibilidade global
    window.fenixSelectCompany = function(companyId, data) {
      return storeInstance.select('company', companyId, data);
    };
    window.fenixSelectProject = function(projectId, data) {
      return storeInstance.select('project', projectId, data);
    };
    window.fenixSelectAgent = function(agentId, data) {
      return storeInstance.select('agent', agentId, data);
    };
    window.fenixSelectMission = function(missionId, data) {
      return storeInstance.select('mission', missionId, data);
    };
    window.fenixClearSelection = function() {
      return storeInstance.clearSelection();
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GlobalSelectionStore, storeInstance };
  }

  console.log('[Fênix] GlobalSelectionStore inicializado (Initial Selection: NULL).');
})();
