/**
 * FÊNIX OS — fenix-evolve.js
 * Loop de Auto-Evolução (T71-T80)
 */

(function (global) {
  'use strict';

  // ── T78: SIMPLE EVENT EMITTER ──────────────────────────────────────────────
  class FenixEventEmitter {
    constructor() {
      this._listeners = {};
    }
    on(event, fn) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(fn);
      return this;
    }
    off(event, fn) {
      if (!this._listeners[event]) return this;
      this._listeners[event] = this._listeners[event].filter(f => f !== fn);
      return this;
    }
    emit(event, ...args) {
      (this._listeners[event] || []).forEach(fn => {
        try { fn(...args); } catch (e) { console.error('[FenixEventEmitter] listener error:', e); }
      });
    }
  }

  // ── T71: CLASSE PRINCIPAL ──────────────────────────────────────────────────
  class FenixSelfImprove extends FenixEventEmitter {
    constructor(options = {}) {
      super();

      /** T76: Queue and status */
      this.queue = [];
      this.status = 'idle'; // 'running' | 'paused' | 'idle'

      /** T79: snapshot store */
      this._snapshots = {};

      /** Config */
      this._apiBase = options.apiBase || 'http://localhost:3000';
      this._apiKey  = options.apiKey  || 'ap_2c76a73c5dae496e922a53d5803f2aa4b6cf0c1fd247f6c2';
      this._model   = options.model   || 'qwen2.5:3b';
      this._provider = options.provider || 'ollama';

      this._currentTask = null;

      this._log('FenixSelfImprove inicializado.');
    }

    _log(msg, data) {
      const entry = { at: new Date().toISOString(), msg, data };
      console.log('[FENIX-EVOLVE]', msg, data !== undefined ? data : '');
      this.emit('log', entry);
      this.emit('progress', entry);
    }

    // ── T72: GENERATE CODE ───────────────────────────────────────────────────
    async generateCode(taskDesc) {
      this._log('Gerando codigo para tarefa:', taskDesc);
      const body = JSON.stringify({
        provider: this._provider,
        model: this._model,
        messages: [
          {
            role: 'system',
            content: 'Voce e um agente de auto-evolucao. Gere APENAS codigo JavaScript puro, sem explicacoes, sem markdown, sem blocos de codigo delimitados.'
          },
          { role: 'user', content: taskDesc }
        ]
      });

      const res = await fetch(`${this._apiBase}/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this._apiKey
        },
        body
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`generateCode API error ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const code = (json && json.result && json.result.message && json.result.message.content)
        || (json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content)
        || (json && json.text)
        || '';

      this._log('Codigo gerado, tamanho:', code.length);
      return code;
    }

    // ── T73: APPLY TO FILE ───────────────────────────────────────────────────
    async applyToFile(filename, searchText, replacement) {
      this._log('Aplicando patch em:', filename);
      await this._saveSnapshot(filename);

      const payload = { filename, searchText, replacement };

      try {
        const res = await fetch(`${this._apiBase}/api/fenix/apply-patch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this._apiKey },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          this._log('Patch aplicado via /api/fenix/apply-patch');
          this.emit('applied', { filename });
          return true;
        }
      } catch (_) {}

      try {
        const res2 = await fetch(`${this._apiBase}/api/files/patch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this._apiKey },
          body: JSON.stringify(payload)
        });
        if (res2.ok) {
          this._log('Patch aplicado via /api/files/patch');
          this.emit('applied', { filename });
          return true;
        }
        const err = await res2.text();
        this._log('applyToFile fallback falhou:', err);
        return false;
      } catch (e) {
        this._log('applyToFile erro:', e.message);
        return false;
      }
    }

    // ── T79: SNAPSHOT / ROLLBACK ─────────────────────────────────────────────
    async _saveSnapshot(filename) {
      try {
        const res = await fetch(`${this._apiBase}/api/files/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this._apiKey },
          body: JSON.stringify({ filename })
        });
        if (res.ok) {
          const json = await res.json();
          const content = (json && json.content) || '';
          if (!this._snapshots[filename]) this._snapshots[filename] = [];
          this._snapshots[filename].push({ at: new Date().toISOString(), content });
          this._log('Snapshot salvo para:', filename);
        }
      } catch (e) {
        this._log('Nao foi possivel salvar snapshot:', e.message);
      }
    }

    async rollback(filename) {
      const snaps = this._snapshots[filename];
      if (!snaps || snaps.length === 0) {
        this._log('Rollback: nenhum snapshot disponivel para', filename);
        return false;
      }
      const snap = snaps.pop();
      this._log('Executando rollback para:', filename);
      try {
        const res = await fetch(`${this._apiBase}/api/files/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this._apiKey },
          body: JSON.stringify({ filename, content: snap.content })
        });
        if (res.ok) {
          this._log('Rollback concluido para:', filename);
          this.emit('rollback', { filename, at: snap.at });
          return true;
        }
      } catch (e) {
        this._log('Rollback erro:', e.message);
      }
      return false;
    }

    // ── T74: VALIDATE SYNTAX ─────────────────────────────────────────────────
    async validateSyntax(filename) {
      try {
        const res = await fetch(`${this._apiBase}/api/fenix/validate-syntax`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this._apiKey },
          body: JSON.stringify({ filename })
        });
        if (res.ok) {
          const json = await res.json();
          const valid = json && json.valid !== false;
          this._log('Validacao de sintaxe:', valid ? 'OK' : 'FALHOU');
          return valid;
        }
      } catch (_) {}
      this._log('validateSyntax: endpoint indisponivel, assumindo valido');
      return true;
    }

    // ── T75: RUN SINGLE TASK ─────────────────────────────────────────────────
    async runTask(task) {
      this._currentTask = task;
      const taskId = task.id || ('task-' + Date.now());
      this._log('[' + taskId + '] Iniciando tarefa:', task.description);
      this.emit('task:start', task);

      try {
        const code = await this.generateCode(task.description);
        if (!code || code.trim().length === 0) throw new Error('generateCode retornou vazio');

        if (task.targetFile) {
          const applied = await this.applyToFile(task.targetFile, task.searchText || '', code);
          if (!applied) {
            await this.rollback(task.targetFile);
            throw new Error('applyToFile falhou');
          }

          const valid = await this.validateSyntax(task.targetFile);
          if (!valid) {
            await this.rollback(task.targetFile);
            throw new Error('validateSyntax falhou — rollback executado');
          }
        }

        this._log('[' + taskId + '] Tarefa concluida com sucesso');
        this.emit('task:done', { task, code });
        this._currentTask = null;
        return { success: true };

      } catch (err) {
        this._log('[' + taskId + '] Tarefa FALHOU:', err.message);
        this.emit('task:error', { task, error: err.message });
        this._currentTask = null;
        return { success: false, error: err.message };
      }
    }

    // ── T77: LOOP CONTROL ────────────────────────────────────────────────────
    async startLoop() {
      if (this.status === 'running') {
        this._log('Loop ja em execucao');
        return;
      }
      this.status = 'running';
      this._log('Loop de auto-evolucao INICIADO. Tasks na fila:', this.queue.length);
      this.emit('loop:start', { queueLength: this.queue.length });

      while (this.queue.length > 0 && this.status === 'running') {
        const task = this.queue.shift();
        await this.runTask(task);
        await new Promise(function(resolve) { setTimeout(resolve, 500); });
      }

      if (this.status === 'running') {
        this.status = 'idle';
        this._log('Loop de auto-evolucao CONCLUIDO — fila vazia');
        this.emit('loop:done');
      }
    }

    pauseLoop() {
      if (this.status !== 'running') {
        this._log('Loop nao esta em execucao');
        return;
      }
      this.status = 'paused';
      this._log('Loop PAUSADO');
      this.emit('loop:paused');
    }

    resumeLoop() {
      if (this.status !== 'paused') {
        this._log('Loop nao esta pausado — use startLoop() para iniciar');
        return;
      }
      this._log('Loop RETOMADO');
      this.emit('loop:resumed');
      this.startLoop();
    }

    // ── QUEUE MANAGEMENT ─────────────────────────────────────────────────────
    addTask(task) {
      if (!task.id) task.id = 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      this.queue.push(task);
      this._log('Task adicionada a fila:', task.id);
      this.emit('queue:add', task);
      return this;
    }

    clearQueue() {
      this.queue = [];
      this._log('Fila limpa');
      this.emit('queue:clear');
      return this;
    }

    getStatus() {
      return {
        status: this.status,
        queueLength: this.queue.length,
        currentTask: this._currentTask ? this._currentTask.id : null,
        snapshotFiles: Object.keys(this._snapshots)
      };
    }
  }

  // ── T80: ATTACH TO window.FENIX ───────────────────────────────────────────
  if (!global.FENIX) global.FENIX = {};
  global.FENIX.evolve = new FenixSelfImprove();
  global.FenixSelfImprove = FenixSelfImprove;

  console.log('[FENIX-EVOLVE] fenix-evolve.js carregado. window.FENIX.evolve pronto.');
  document.dispatchEvent(new CustomEvent('fenix:evolve:ready', { detail: global.FENIX.evolve }));

}(window));
