import { logger } from '../../utils/logger.js';

// Define error codes
export enum WebSearchErrorCode {
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SECURITY_ERROR = 'SECURITY_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  CACHE_ERROR = 'CACHE_ERROR'
}

// Define error interface
export interface WebSearchError {
  code: WebSearchErrorCode;
  message: string;
  hint?: string;
  details?: any;
}

/**
 * Create a standardized error response
 * @param code Error code
 * @param message Error message
 * @param hint Optional hint for resolution
 * @param details Optional detailed error information
 * @returns WebSearchError object
 */
export function createWebSearchError(
  code: WebSearchErrorCode,
  message: string,
  hint?: string,
  details?: any
): WebSearchError {
  return {
    code,
    message,
    hint,
    details
  };
}

/**
 * Handle API errors with exponential backoff
 * @param operation Function to retry
 * @param maxRetries Maximum number of retries
 * @param baseDelay Base delay in milliseconds
 * @returns Promise with result or error
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // If this is the last attempt, re-throw the error
      if (attempt === maxRetries) {
        logger.error('Operation failed after all retries', {
          error: error,
          attempt,
          maxRetries
        });
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);

      logger.warn('Operation failed, retrying', {
        error: error,
        attempt: attempt + 1,
        maxRetries,
        delay
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError;
}

/**
 * Handle timeout for operations
 * @param operation Function to execute with timeout
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise with result or timeout error
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // Set up timeout
    const timeout = setTimeout(() => {
      reject(createWebSearchError(
        WebSearchErrorCode.TIMEOUT_ERROR,
        `Operation timed out after ${timeoutMs}ms`,
        'Try again later or check your network connection'
      ));
    }, timeoutMs);

    // Execute operation
    operation()
      .then(result => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

/**
 * Format error for user display
 * @param error WebSearchError or Error object
 * @returns Formatted error message
 */
export function formatError(error: WebSearchError | Error): string {
  if (isWebSearchError(error)) {
    return `${error.code}: ${error.message}` + (error.hint ? ` (${error.hint})` : '');
  } else {
    return `Error: ${error.message}`;
  }
}

/**
 * Type guard to check if an object is a WebSearchError
 * @param error Object to check
 * @returns true if object is a WebSearchError, false otherwise
 */
export function isWebSearchError(error: any): error is WebSearchError {
  return (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    Object.values(WebSearchErrorCode).includes(error.code)
  );
}

/**
 * Handle common API errors
 * @param error Error object
 * @returns WebSearchError with appropriate code and message
 */
export function handleApiError(error: any): WebSearchError {
  logger.error('API error occurred', { error });

  // Handle network errors
  if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
    return createWebSearchError(
      WebSearchErrorCode.NETWORK_ERROR,
      'Network error occurred while connecting to the API',
      'Check your internet connection and try again'
    );
  }

  // Handle timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
    return createWebSearchError(
      WebSearchErrorCode.TIMEOUT_ERROR,
      'Request timed out while connecting to the API',
      'The API is taking too long to respond. Try again later'
    );
  }

  // Handle HTTP errors
  if (error.response) {
    const status = error.response.status;

    switch (status) {
      case 400:
        return createWebSearchError(
          WebSearchErrorCode.INVALID_PARAMETERS,
          'Invalid parameters sent to the API',
          'Check your search parameters and try again'
        );
      case 401:
      case 403:
        return createWebSearchError(
          WebSearchErrorCode.API_ERROR,
          'API authentication failed',
          'Check your API key and permissions'
        );
      case 429:
        return createWebSearchError(
          WebSearchErrorCode.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          'Too many requests. Please wait before trying again'
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return createWebSearchError(
          WebSearchErrorCode.API_ERROR,
          'API service temporarily unavailable',
          'The service is currently unavailable. Please try again later'
        );
      default:
        return createWebSearchError(
          WebSearchErrorCode.API_ERROR,
          `API error: ${status} ${error.response.statusText}`,
          'An unexpected error occurred with the API'
        );
    }
  }

  // Handle quota errors (specific to Perplexity/Sonar)
  if (error.message && error.message.includes('quota')) {
    return createWebSearchError(
      WebSearchErrorCode.QUOTA_EXCEEDED,
      'API quota exceeded',
      'Your API quota has been exceeded. Check your plan or try again later'
    );
  }

  // Default error
  return createWebSearchError(
    WebSearchErrorCode.API_ERROR,
    error.message || 'An unknown error occurred',
    'An unexpected error occurred. Please try again'
  );
}