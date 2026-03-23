export interface IntentResult {
  intent: 'sales' | 'support' | 'follow_up' | 'general';
  confidence: number;
}

export async function classify(message: string): Promise<IntentResult> {
  const text = message.toLowerCase();

  if (/(comprar|preco|or[\s-]?camento|plano|assinar|contratar)/.test(text)) {
    return { intent: 'sales', confidence: 0.92 };
  }

  if (/(erro|bug|falha|suporte|ajuda|problema)/.test(text)) {
    return { intent: 'support', confidence: 0.89 };
  }

  if (/(retorno|follow[\s-]?up|voltar contato|continuidade)/.test(text)) {
    return { intent: 'follow_up', confidence: 0.86 };
  }

  return { intent: 'general', confidence: 0.75 };
}
