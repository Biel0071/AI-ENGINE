const { randomUUID } = require('node:crypto');
const { EventEmitter } = require('node:events');

class FenixRealtimeDuplexEngine extends EventEmitter {
  constructor() {
    super();
    this.activeSessions = new Map();
  }

  createSession({ tenantId, actorId, sampleRate = 16000, voiceMode = 'duplex_simultaneous' }) {
    const sessionId = `rt-session-${randomUUID()}`;
    const session = {
      id: sessionId,
      tenantId,
      actorId,
      sampleRate,
      voiceMode,
      status: 'CONNECTED',
      isSpeaking: false,
      isInterrupted: false,
      audioBuffer: [],
      history: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };
    this.activeSessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error(`Sessão Realtime não encontrada: ${sessionId}`);
    return session;
  }

  interruptSession(sessionId) {
    const session = this.getSession(sessionId);
    session.isSpeaking = false;
    session.isInterrupted = true;
    session.audioBuffer = [];
    this.emit('interrupted', { sessionId, timestamp: new Date().toISOString() });
    return { ok: true, sessionId, status: 'INTERRUPTED_BARGE_IN' };
  }

  async *streamDuplexResponse(sessionId, userPrompt, options = {}) {
    const session = this.getSession(sessionId);
    session.isSpeaking = true;
    session.isInterrupted = false;
    session.lastActivity = new Date().toISOString();

    const responseTemplate = [
      "Olá! Sou a plataforma de inteligência em tempo real do FÊNIX.",
      " Estou processando seu áudio e contexto em modo duplex simultâneo.",
      " Todas as redes cognitivas e a Capability Mesh estão conectadas.",
      " Pode falar a qualquer momento — se você falar por cima, eu interrompo imediatamente."
    ];

    yield { type: 'session_start', sessionId, mode: session.voiceMode };

    for (const chunk of responseTemplate) {
      if (session.isInterrupted) {
        yield { type: 'interrupted', sessionId, reason: 'user_barge_in' };
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, options.delayMs || 150));
      yield {
        type: 'token_chunk',
        sessionId,
        token: chunk,
        audioChunkBase64: Buffer.from(chunk).toString('base64'),
        timestamp: new Date().toISOString()
      };
    }

    session.isSpeaking = false;
    yield { type: 'session_done', sessionId, timestamp: new Date().toISOString() };
  }

  processAudioChunk(sessionId, base64AudioData) {
    const session = this.getSession(sessionId);
    if (session.isSpeaking) {
      this.interruptSession(sessionId);
    }
    session.audioBuffer.push(base64AudioData);
    session.lastActivity = new Date().toISOString();
    return {
      ok: true,
      sessionId,
      bufferSize: session.audioBuffer.length,
      bargeInTriggered: session.isInterrupted
    };
  }

  closeSession(sessionId) {
    this.activeSessions.delete(sessionId);
    return { ok: true, sessionId, status: 'CLOSED' };
  }
}

module.exports = { FenixRealtimeDuplexEngine };
