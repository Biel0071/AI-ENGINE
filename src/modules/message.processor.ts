export interface EngineInput {
  message: string;
  from?: string | number;
  context?: Record<string, unknown>;
}

export function sanitizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, ' ');
}

export function validateInput(input: Partial<EngineInput>): asserts input is EngineInput {
  if (!input || typeof input.message !== 'string' || input.message.trim().length === 0) {
    throw new Error('Invalid input: "message" is required');
  }

  if (input.context !== undefined && (typeof input.context !== 'object' || input.context === null)) {
    throw new Error('Invalid input: "context" must be an object');
  }
}
