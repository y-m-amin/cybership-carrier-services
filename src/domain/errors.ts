export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "MALFORMED_RESPONSE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  code: ErrorCode;
  status?: number;
  retryable: boolean;
  details?: unknown;
  cause?: unknown;

  constructor(args: {
    code: ErrorCode;
    message: string;
    status?: number;
    retryable?: boolean;
    details?: unknown;
    cause?: unknown;
  }) {
    super(args.message);
    this.code = args.code;
    this.status = args.status;
    this.retryable = args.retryable ?? false;
    this.details = args.details;
    this.cause = args.cause;
  }
}
