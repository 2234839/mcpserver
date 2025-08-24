export function createMessage(content: any[], prompt: string) {
  return [{
    role: 'user' as const,
    content: [...content, { type: 'text' as const, text: prompt }]
  }];
}

export function createErrorResponse(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }]
  };
}

export function createSuccessResponse(result: string | object) {
  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  return {
    content: [{ type: 'text' as const, text }]
  };
}