export function record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
const str = (value) => typeof value === 'string' ? value : undefined;
const states = new Set([
    'input-streaming', 'input-available', 'approval-requested', 'approval-responded',
    'output-available', 'output-error', 'output-denied',
]);
export function fromUIMessage(message, options = {}) {
    if (!message || typeof message.id !== 'string' || !message.id ||
        message.role !== 'assistant' || !Array.isArray(message.parts)) {
        throw new TypeError('Expected an assistant UIMessage with an id and parts array.');
    }
    const events = [];
    const ids = new Map();
    let step = 0;
    const add = (event) => {
        const previous = ids.get(event.id);
        if (previous === undefined) {
            ids.set(event.id, events.length);
            events.push(event);
        }
        else
            events[previous] = event; // Replayed tool snapshots update, never duplicate.
    };
    message.parts.forEach((part, index) => {
        if (!record(part) || typeof part.type !== 'string')
            return;
        if (part.type === 'step-start') {
            step++;
            return;
        }
        const id = `part:${index}`;
        const duration = options.durations?.[id];
        const durationMs = Number.isFinite(duration) && duration >= 0 ? duration : undefined;
        if ((part.type === 'text' || part.type === 'reasoning') && typeof part.text === 'string') {
            add({ type: part.type, id, step, text: part.text, durationMs, streaming: part.state === 'streaming' });
        }
        else if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
            if (typeof part.toolCallId !== 'string' || !part.toolCallId)
                return;
            const name = part.type === 'dynamic-tool' ? str(part.toolName) : part.type.slice(5);
            if (!name)
                return;
            const metric = options.durations?.[part.toolCallId];
            const approval = record(part.approval) && typeof part.approval.id === 'string'
                ? { id: part.approval.id, approved: typeof part.approval.approved === 'boolean' ? part.approval.approved : undefined,
                    reason: str(part.approval.requestReason) ?? str(part.approval.reason) }
                : undefined;
            add({
                type: 'tool', id: part.toolCallId, step, name, title: str(part.title),
                state: states.has(part.state) ? part.state : 'unknown',
                input: part.input, output: part.output, errorText: str(part.errorText),
                preliminary: part.preliminary === true, approval,
                durationMs: Number.isFinite(metric) && metric >= 0 ? metric : undefined,
            });
        }
        else if (part.type === 'file' && typeof part.url === 'string' && typeof part.mediaType === 'string') {
            add({ type: 'asset', id, step, asset: {
                    id, url: part.url, mediaType: part.mediaType, filename: str(part.filename),
                } });
        }
        else if (part.type === 'source-url' && typeof part.url === 'string') {
            add({ type: 'source', id, step, url: part.url, title: str(part.title) ?? part.url });
        }
        else if (part.type === 'source-document' && typeof part.title === 'string') {
            add({ type: 'source', id, step, title: part.title });
        }
        else if (part.type.startsWith('data-')) {
            const mapped = options.mapDataPart?.(part, index);
            if (mapped)
                add(mapped);
        }
        // Provider metadata, hidden reasoning files, and unregistered custom parts are not rendered.
    });
    return { id: message.id, events, status: options.status ?? 'idle', error: options.error };
}
export function toolIsPending(tool) {
    return tool.state === 'input-streaming' || tool.state === 'input-available' ||
        (tool.state === 'approval-responded' && tool.approval?.approved === true) ||
        (tool.state === 'output-available' && tool.preliminary === true);
}
export function toolStatus(tool, run) {
    if (tool.state === 'output-error')
        return 'Failed';
    if (tool.state === 'output-denied' || (tool.state === 'approval-responded' && tool.approval?.approved === false))
        return 'Denied';
    if (tool.state === 'approval-requested')
        return 'Approval required';
    if (tool.state === 'output-available' && !tool.preliminary)
        return 'Completed';
    if (tool.state === 'unknown')
        return 'Unknown state';
    if (run === 'interrupted')
        return 'Interrupted';
    if (run === 'error')
        return 'Incomplete';
    if (tool.state === 'output-available')
        return run === 'streaming' ? 'Receiving result' : 'Partial result';
    if (tool.state === 'approval-responded')
        return 'Approved · awaiting result';
    if (tool.state === 'input-streaming')
        return run === 'streaming' ? 'Preparing' : 'Incomplete input';
    return run === 'streaming' ? 'Running' : 'Awaiting result';
}
export function durationLabel(ms) {
    if (ms === undefined || !Number.isFinite(ms) || ms < 0)
        return '';
    return ms < 1000 ? `${Math.round(ms)}ms` : `${Number((ms / 1000).toFixed(ms < 10000 ? 1 : 0))}s`;
}
/** A display aid, not a security boundary. Redact sensitive material on the server. */
export function formatValue(value) {
    if (value === undefined)
        return '';
    if (typeof value === 'string')
        return value;
    const seen = new WeakSet();
    try {
        return JSON.stringify(value, (key, item) => {
            if (/^(password|passwd|secret|clientsecret|token|accesstoken|refreshtoken|apikey|authorization|cookie|setcookie|privatekey)$/i.test(key.replace(/[-_\s]/g, '')))
                return '[redacted]';
            if (typeof item === 'bigint')
                return item.toString();
            if (typeof item === 'object' && item !== null) {
                if (seen.has(item))
                    return '[repeated reference]';
                seen.add(item);
            }
            return item;
        }, 2) ?? String(value);
    }
    catch {
        return '[Unable to display this value]';
    }
}
/** Reject active-content schemes, credentials, control characters and unsafe data files. */
export function safeURL(raw, base, image = false, origins = []) {
    if (!raw || /[\u0000-\u001f\u007f]/.test(raw))
        return null;
    if (/^data:/i.test(raw)) {
        return image && /^data:image\/(png|jpeg|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i.test(raw) ? raw : null;
    }
    try {
        const url = new URL(raw, base);
        const ownOrigin = new URL(base).origin;
        if (url.username || url.password)
            return null;
        if (url.protocol === 'blob:')
            return url.origin === ownOrigin ? url.href : null;
        if (!['https:', 'http:'].includes(url.protocol))
            return null;
        if (image && url.origin !== ownOrigin && !origins.includes(url.origin))
            return null;
        return url.href;
    }
    catch {
        return null;
    }
}
