export class DomainError extends Error {
  readonly code: string;
  readonly recoverable: boolean;
  readonly details?: Record<string, string | number | boolean | null>;

  constructor(
    code: string,
    message: string,
    options?: { recoverable?: boolean; details?: Record<string, string | number | boolean | null> },
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.recoverable = options?.recoverable ?? true;
    this.details = options?.details;
  }
}

export interface SerializedError {
  code: string;
  message: string;
  recoverable: boolean;
  details?: Record<string, string | number | boolean | null>;
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof DomainError) {
    return {
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      details: error.details,
    };
  }
  if (error instanceof Error) {
    return {
      code: 'UNEXPECTED',
      message: error.message || 'An unexpected error occurred.',
      recoverable: true,
    };
  }
  return {
    code: 'UNEXPECTED',
    message: 'An unexpected error occurred.',
    recoverable: true,
  };
}

export function userFacingError(error: SerializedError): string {
  switch (error.code) {
    case 'RESTRICTED_URL':
      return 'This page cannot be scanned. Open a regular website tab and try again.';
    case 'NO_ACTIVE_TAB':
      return 'No active tab was found. Click the Page2Design icon on the page you want to scan.';
    case 'INJECTION_FAILED':
      return 'Could not access this tab. Click the extension icon on the page, then scan again.';
    case 'CANCELLED':
      return 'Scan cancelled.';
    case 'EXPORT_FAILED':
      return 'Export failed. You can retry without failed assets.';
    default:
      return error.message;
  }
}
