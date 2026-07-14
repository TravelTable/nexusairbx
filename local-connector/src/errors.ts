import type { JsonObject } from "./types.js";

export class ConnectorError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly details?: JsonObject;

  constructor(
    code: string,
    message: string,
    options: { retryable?: boolean; details?: JsonObject; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ConnectorError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    if (options.details !== undefined) this.details = options.details;
  }
}

export function asConnectorError(error: unknown, fallbackCode = "CONNECTOR_ERROR"): ConnectorError {
  if (error instanceof ConnectorError) return error;
  if (error instanceof Error) {
    return new ConnectorError(fallbackCode, error.message, { cause: error });
  }
  return new ConnectorError(fallbackCode, "An unknown connector error occurred.");
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

