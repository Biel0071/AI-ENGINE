'use strict';

/**
 * FÊNIX OS — Reference Acquisition Engine (Intent Engine 2.0)
 * ==========================================================
 * Transforms external references (URLs, screenshots, codebases, videos, specs)
 * into structured architectural, visual, functional, and interaction knowledge
 * WITHOUT copying proprietary code or violating design sovereignty.
 * Adheres to Section 14 & 15 of Fênix Intent Constitution.
 */

class ReferenceAcquisitionEngine {
  constructor(options = {}) {
    this.knowledgeStore = options.knowledgeStore || null;
    this.logger = options.logger || console;
  }

  /**
   * Ingests any reference source and extracts structured knowledge dimensions
   */
  async ingestReference(input = {}) {
    const type = this.detectReferenceType(input);
    const rawContent = typeof input.capturedHtml === 'string' ? input.capturedHtml
      : typeof input.content === 'string' ? input.content
        : typeof input.text === 'string' ? input.text : '';

    const functionalKnowledge = this.extractFunctionalDimensions(rawContent, type);
    const visualKnowledge = this.extractVisualDimensions(input.visualObservations);
    const architecturalKnowledge = this.extractArchitecturalDimensions(input.codeEvidence);
    const interactionKnowledge = this.extractInteractionDimensions(input.interactionObservations);
    const hasCapturedContent = Boolean(rawContent.trim() || (Array.isArray(input.visualObservations) && input.visualObservations.length));

    const referenceSpec = {
      referenceId: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      source: input.source || 'user_input',
      ingestedAt: new Date().toISOString(),
      analysisStatus: hasCapturedContent ? 'PARTIALLY_ANALYZED' : type === 'URL_WEBSITE' ? 'NEEDS_CAPTURE' : 'NEEDS_ANALYSIS',
      evidence: {
        captureProvided: hasCapturedContent,
        urlFetched: false,
        sourceType: type,
        limitations: type === 'URL_WEBSITE' && !rawContent
          ? ['A URL foi registrada, mas o conteúdo do site não foi acessado nesta análise.']
          : type === 'SCREENSHOT' && !input.visualObservations?.length
            ? ['A captura precisa ser analisada por visão; dimensões, cores e componentes não foram medidos.']
            : ['A extração heurística produz pistas inferidas, não validação visual ou funcional.'],
      },
      knowledge: {
        functional: functionalKnowledge,
        visual: visualKnowledge,
        architectural: architecturalKnowledge,
        interaction: interactionKnowledge,
      },
      adaptationStrategy: {
        principle: 'Evolve, Enhance, Never Blindly Copy',
        targetFenixViews: Array.isArray(input.targetFenixViews) ? input.targetFenixViews : [],
        recommendedArchitecture: architecturalKnowledge.recommendedPattern || null,
        nextAction: hasCapturedContent ? 'VALIDATE_IN_PROJECT_CONTEXT' : 'PROVIDE_CAPTURE_OR_AUTHORIZED_CONTENT'
      }
    };

    return referenceSpec;
  }

  detectReferenceType(input) {
    if (input.type) return input.type.toUpperCase();
    const str = String(input.url || input.content || input.text || '').trim();
    if (/^https?:\/\//i.test(str)) return 'URL_WEBSITE';
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(str)) return 'SCREENSHOT';
    if (/\.(mp4|webm|mov|mkv)$/i.test(str)) return 'VIDEO';
    if (/\.(js|ts|py|json|html|css|cpp)$/i.test(str) || str.includes('class ') || str.includes('function ')) return 'CODEBASE';
    if (/\.(md|txt|pdf|docx?)$/i.test(str)) return 'DOCUMENT';
    return 'USER_DESCRIPTION';
  }

  extractFunctionalDimensions(content, type) {
    const text = String(content).toLowerCase();
    const capabilities = [];
    const evidence = [];

    const signals = [
      [/\b(auth|login|user)\b/i, 'AUTHENTICATION_RBAC'],
      [/\b(chat|message|conversa)\b/i, 'REALTIME_MESSAGING'],
      [/\b(dashboard|metric|painel)\b/i, 'ANALYTIC_DASHBOARD'],
      [/\b(agent|bot|ai)\b/i, 'EMBODIED_AGENTS'],
      [/\b(saas|billing|checkout)\b/i, 'COMMERCE_BILLING'],
      [/\b(ticket|suporte|atendimento)\b/i, 'CUSTOMER_SUPPORT_QUEUE'],
    ];
    for (const [pattern, capability] of signals) {
      const match = pattern.exec(text);
      if (!match) continue;
      capabilities.push(capability);
      evidence.push({ capability, classification: 'INFERRED_FROM_TEXT', excerpt: String(content).slice(Math.max(0, match.index - 40), match.index + match[0].length + 60) });
    }

    return {
      status: content ? 'INFERRED_FROM_TEXT' : 'NOT_ANALYZED',
      coreCapabilities: capabilities,
      evidence,
      sourceType: type,
      limitations: content ? ['Pistas de texto não comprovam execução, permissão, fluxo completo ou estado real.'] : ['Nenhum conteúdo capturado para análise.']
    };
  }

  extractVisualDimensions(observations = []) {
    const measured = Array.isArray(observations) ? observations.filter((item) => item && typeof item === 'object') : [];
    return {
      status: measured.length ? 'OBSERVED_INPUT_REQUIRES_VALIDATION' : 'NOT_MEASURED',
      observations: measured,
      colorPalette: null,
      typography: null,
      spacingScale: null,
      contrastRatio: null,
      limitation: measured.length ? 'Observações fornecidas precisam de captura/localização verificável antes de serem tratadas como medidas.' : 'Sem captura analisada por visão; nenhuma cor, fonte ou distância foi medida.'
    };
  }

  extractArchitecturalDimensions(codeEvidence) {
    const evidence = Array.isArray(codeEvidence) ? codeEvidence.filter((item) => item && typeof item === 'object') : [];
    return {
      status: evidence.length ? 'OBSERVED_INPUT_REQUIRES_VALIDATION' : 'NOT_INSPECTED',
      recommendedPattern: null,
      evidence,
      limitation: 'Arquitetura não é inferida a partir do nome da URL ou da aparência da tela.'
    };
  }

  extractInteractionDimensions(observations) {
    const evidence = Array.isArray(observations) ? observations.filter((item) => item && typeof item === 'object') : [];
    return {
      status: evidence.length ? 'OBSERVED_INPUT_REQUIRES_REPRODUCTION' : 'NOT_OBSERVED',
      evidence,
      limitation: 'Interações só são confirmadas ao reproduzir ações e estados no sistema de referência.'
    };
  }
}

module.exports = { ReferenceAcquisitionEngine };
