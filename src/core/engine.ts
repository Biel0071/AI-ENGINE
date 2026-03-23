import { classify } from '../modules/lead.classifier';
import { sanitizeMessage, type EngineInput, validateInput } from '../modules/message.processor';
import { generateResponse } from '../modules/response.generator';
import { MemoryStore } from '../memory/memory.store';

interface EngineOutput {
  intent: string;
  response: string;
  score: number;
  meta: {
    engineVersion: string;
  };
}

export class AIEngine {
  constructor(private readonly memoryStore = new MemoryStore()) {}

  async run(input: Partial<EngineInput>): Promise<EngineOutput> {
    validateInput(input);
    const message = sanitizeMessage(input.message);

    const classification = await classify(message);
    const response = await generateResponse(message, classification);

    this.memoryStore.save({
      from: String(input.from ?? 'unknown'),
      message,
      intent: classification.intent,
      response,
      createdAt: new Date().toISOString(),
    });

    return {
      intent: classification.intent,
      response,
      score: classification.confidence,
      meta: {
        engineVersion: '1.0.0',
      },
    };
  }
}
