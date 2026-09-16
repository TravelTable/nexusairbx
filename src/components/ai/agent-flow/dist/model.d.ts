/**
 * Structural adapter for the AI SDK UIMessage protocol; no SDK runtime required.
 * Contract inspected in vercel/ai/packages/ai/src/ui/ui-messages.ts.
 * The caller must send only user-visible reasoning summaries, never hidden traces.
 */
export type RunStatus = 'streaming' | 'idle' | 'interrupted' | 'error';
export type ToolState = 'input-streaming' | 'input-available' | 'approval-requested' | 'approval-responded' | 'output-available' | 'output-error' | 'output-denied' | 'unknown';
export interface Asset {
    id: string;
    url: string;
    mediaType: string;
    filename?: string;
    alt?: string;
    width?: number;
    height?: number;
}
interface BaseEvent {
    id: string;
    step?: number;
    durationMs?: number;
}
export interface TextEvent extends BaseEvent {
    type: 'text' | 'reasoning';
    text: string;
    streaming?: boolean;
}
export interface ToolEvent extends BaseEvent {
    type: 'tool';
    name: string;
    title?: string;
    state: ToolState;
    input?: unknown;
    output?: unknown;
    errorText?: string;
    preliminary?: boolean;
    approval?: {
        id: string;
        approved?: boolean;
        reason?: string;
    };
}
export interface AssetEvent extends BaseEvent {
    type: 'asset';
    asset: Asset;
}
export interface SourceEvent extends BaseEvent {
    type: 'source';
    url?: string;
    title: string;
}
export type FlowEvent = TextEvent | ToolEvent | AssetEvent | SourceEvent;
export interface AgentRun {
    id: string;
    status: RunStatus;
    events: readonly FlowEvent[];
    error?: string;
}
export interface MessageLike {
    id: string;
    role: string;
    parts: readonly unknown[];
}
export interface AdapterOptions {
    status?: RunStatus;
    error?: string;
    /** Measured by the server; keys are toolCallId or `part:INDEX`. No invented clock. */
    durations?: Readonly<Record<string, number>>;
    /** Custom SDK data parts are intentionally opt-in. Return stable IDs. */
    mapDataPart?: (part: Record<string, unknown>, index: number) => FlowEvent | undefined;
}
export interface ToolPresentation {
    label?: string;
    kind?: 'search' | 'terminal' | 'image' | 'file' | 'tool';
    summary?: (tool: ToolEvent) => string;
    formatInput?: (input: unknown) => string;
    formatOutput?: (output: unknown) => string;
    /** Only return artifacts present in the actual tool result. */
    assets?: (tool: ToolEvent) => readonly Asset[];
}
export interface FlowOptions {
    tools?: Readonly<Record<string, ToolPresentation>>;
    /** Default: same-origin only, plus raster data URLs and same-origin blob URLs. */
    assetOrigins?: readonly string[];
    /** Defaults to false: completed reasoning can be expanded on demand. */
    expandReasoning?: boolean;
    /** Defaults to true: tools stay in their original position in the conversation. */
    expandGroups?: boolean;
    /** Number of characters initially shown per tool input/output. Default 12000. */
    outputPreviewChars?: number;
}
export interface ApprovalDecision {
    id: string;
    approved: boolean;
}
export type ApprovalHandler = (decision: ApprovalDecision) => void | Promise<void>;
export declare function record(value: unknown): value is Record<string, unknown>;
export declare function fromUIMessage(message: MessageLike, options?: AdapterOptions): AgentRun;
export declare function toolIsPending(tool: ToolEvent): boolean;
export declare function toolStatus(tool: ToolEvent, run: RunStatus): string;
export declare function durationLabel(ms?: number): string;
/** A display aid, not a security boundary. Redact sensitive material on the server. */
export declare function formatValue(value: unknown): string;
/** Reject active-content schemes, credentials, control characters and unsafe data files. */
export declare function safeURL(raw: string, base: string, image?: boolean, origins?: readonly string[]): string | null;
export {};
