// Provider port (padrão LiteLLM): 1 interface, N adapters. O EchoProvider é determinístico
// para testes/dev offline. Adapters reais (OpenAI/Anthropic/Gemini/Groq/Ollama) implementam
// complete({ model, prompt, temperature }) -> { text, promptTokens, completionTokens }.

function estimateTokens(text) {
  // aproximação: ~4 chars/token
  return Math.max(1, Math.ceil(String(text).length / 4));
}

class EchoProvider {
  constructor(name = 'echo') { this.name = name; this.models = ['echo-small', 'echo-large']; }

  async complete({ model, prompt, temperature = 0 }) {
    const text = `[${model}] ${deterministicAnswer(prompt)}`;
    return {
      text,
      model,
      promptTokens: estimateTokens(prompt),
      completionTokens: estimateTokens(text),
    };
  }
}

// resposta estável e sem aleatoriedade (temperature ignorada de propósito no mock)
function deterministicAnswer(prompt) {
  const p = String(prompt).trim();
  if (/^plan:/i.test(p)) return 'PLAN OK';
  return `answer(${p.length})`;
}

module.exports = { EchoProvider, estimateTokens };
