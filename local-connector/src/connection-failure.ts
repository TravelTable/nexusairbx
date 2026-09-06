import { asConnectorError } from "./errors.js";
import { redact } from "./logger.js";

export interface ConnectionFailure {
  code: string;
  stage: "mcp" | "tool_discovery" | "studio_target" | "cloud_registration";
  diagnostic: string;
}

export function connectionFailure(error: unknown, stage: ConnectionFailure["stage"]): ConnectionFailure {
  const failure = asConnectorError(error);
  return {
    code: failure.code,
    stage: failure.details?.connectionStage === "cloud_registration" ? "cloud_registration" : stage,
    diagnostic: redact(failure.details?.diagnostic ?? failure.message).replace(/\s+/g, " ").slice(0, 1000),
  };
}
