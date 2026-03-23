export interface EngineInput {
  message: string;
  from?: string | number;
}

export function sanitizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, ' ');
}

export function validateInput(input: Partial<EngineInput>): asserts input is EngineInput {
  if (!input || typeof input.message !== 'string' || input.message.trim().length === 0) {
    throw new Error('Invalid input: "message" is required');
  }
}
