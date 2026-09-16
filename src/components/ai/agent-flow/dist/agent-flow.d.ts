import type { AgentRun, ApprovalHandler, FlowOptions } from './model.js';
export { fromUIMessage } from './model.js';
export type {
  RunStatus,
  ToolState,
  Asset,
  TextEvent,
  ToolEvent,
  AssetEvent,
  SourceEvent,
  FlowEvent,
  AgentRun,
  MessageLike,
  AdapterOptions,
  ToolPresentation,
  FlowOptions,
  ApprovalDecision,
  ApprovalHandler,
} from './model.js';
export interface AgentFlowElement extends HTMLElement {
    run: AgentRun | null;
    options: FlowOptions;
    onApproval: ApprovalHandler | undefined;
}
/** Register explicitly; importing this module is safe during server rendering. */
export declare function defineAgentFlow(tagName?: string): void;
