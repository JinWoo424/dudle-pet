export async function withRetry<T>(operation: () => Promise<T>, options = { attempts: 3, baseDelayMs: 300 }) {
  let lastError: unknown;
  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      if (attempt === options.attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, options.baseDelayMs * 2 ** attempt));
    }
  }
  throw lastError;
}

