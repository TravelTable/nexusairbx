const TOKEN_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /nsmcp_[A-Za-z0-9_-]+_[A-Za-z0-9._~-]+/g, replacement: "[REDACTED]" },
  { pattern: /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, replacement: "Bearer [REDACTED]" },
  {
    pattern: /(["']?(?:token|secret|authorization)["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi,
    replacement: "$1[REDACTED]",
  },
];

const MAX_LOG_CHARS = 4_096;

export function redact(value: unknown, secrets: Iterable<string> = []): string {
  let text = typeof value === "string" ? value : safeStringify(value);
  for (const secret of secrets) {
    if (secret.length >= 4) text = text.split(secret).join("[REDACTED]");
  }
  for (const { pattern, replacement } of TOKEN_PATTERNS) text = text.replace(pattern, replacement);
  if (text.length > MAX_LOG_CHARS) text = `${text.slice(0, MAX_LOG_CHARS)}…[truncated]`;
  return text;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

export interface Logger {
  info(message: string, details?: unknown): void;
  warn(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
  debug(message: string, details?: unknown): void;
  addSecret(secret: string): void;
}

export class ConsoleLogger implements Logger {
  readonly #secrets = new Set<string>();

  constructor(private readonly verbose = false) {}

  addSecret(secret: string): void {
    if (secret.length >= 4) this.#secrets.add(secret);
  }

  info(message: string, details?: unknown): void {
    this.write("INFO", message, details);
  }

  warn(message: string, details?: unknown): void {
    this.write("WARN", message, details);
  }

  error(message: string, details?: unknown): void {
    this.write("ERROR", message, details);
  }

  debug(message: string, details?: unknown): void {
    if (this.verbose) this.write("DEBUG", message, details);
  }

  private write(level: string, message: string, details?: unknown): void {
    const suffix = details === undefined ? "" : ` ${redact(details, this.#secrets)}`;
    const line = `[${level}] ${redact(message, this.#secrets)}${suffix}`;
    if (level === "ERROR") console.error(line);
    else if (level === "WARN") console.warn(line);
    else console.log(line);
  }
}
