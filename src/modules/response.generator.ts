import type { IntentResult } from './lead.classifier';

export async function generateResponse(message: string, result: IntentResult): Promise<string> {
  const cleanMessage = message.trim();

  switch (result.intent) {
    case 'sales':
      return `Perfeito, posso te ajudar com planos e valores. Sobre "${cleanMessage}", quer que eu te envie uma proposta resumida agora?`;
    case 'support':
      return `Entendi o problema. Vou te ajudar com "${cleanMessage}". Pode me dizer quando começou e qual foi o ultimo erro exibido?`;
    case 'follow_up':
      return 'Claro, vamos continuar daqui. Posso retomar o historico e sugerir o proximo passo para avancar o atendimento.';
    default:
      return 'Recebi sua mensagem. Posso classificar sua necessidade e seguir com o proximo passo automaticamente.';
  }
}
