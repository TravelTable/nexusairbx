import { AGENT_FLOW_CSS } from './styles.js';
import { durationLabel, formatValue, safeURL, toolIsPending, toolStatus, } from './model.js';
export { fromUIMessage } from './model.js';
const el = (tag, cls = '') => {
    const node = document.createElement(tag);
    if (cls)
        node.className = cls;
    return node;
};
const setText = (node, value) => {
    if (node.textContent === value)
        return;
    // Appending to the existing text node preserves selection while tokens stream.
    const text = node.firstChild;
    if (text instanceof Text && node.childNodes.length === 1) {
        if (value.startsWith(text.data))
            text.appendData(value.slice(text.length));
        else
            text.replaceData(0, text.length, value);
    }
    else
        node.replaceChildren(document.createTextNode(value));
};
const button = (label, cls = '') => {
    const node = el('button', cls);
    node.type = 'button';
    node.textContent = label;
    return node;
};
function fold(cls) {
    const node = el('details', cls);
    const head = el('summary');
    const label = el('span', 'label');
    const meta = el('span', 'meta');
    const chevron = el('span', 'chevron');
    chevron.setAttribute('aria-hidden', 'true');
    head.append(label, meta, chevron);
    node.append(head);
    return { node, head, label, meta, chevron };
}
/** Keyed reconciliation: no innerHTML, whole-message replacement or automatic scrolling. */
class KeyedList {
    parent;
    create;
    views = new Map();
    constructor(parent, create) {
        this.parent = parent;
        this.create = create;
    }
    update(items) {
        const keep = new Set();
        let cursor = this.parent.firstChild;
        for (const item of items) {
            if (keep.has(item.id))
                continue;
            keep.add(item.id);
            let view = this.views.get(item.id);
            if (!view) {
                view = this.create(item);
                this.views.set(item.id, view);
            }
            view.update(item);
            if (view.node !== cursor)
                this.parent.insertBefore(view.node, cursor);
            cursor = view.node.nextSibling;
        }
        for (const [id, view] of this.views) {
            if (!keep.has(id)) {
                view.dispose?.();
                view.node.remove();
                this.views.delete(id);
            }
        }
    }
    clear() { for (const view of this.views.values()) {
        view.dispose?.();
        view.node.remove();
    } this.views.clear(); }
}
function blocks(events) {
    const result = [];
    for (const event of events) {
        const last = result.at(-1);
        if (event.type === 'tool') {
            if (last?.type === 'group' && last.tools.at(-1)?.step === event.step)
                last.tools.push(event);
            else
                result.push({ type: 'group', id: `group:${event.id}`, tools: [event] });
        }
        else
            result.push(event);
    }
    return result;
}
function presentation(ctx, tool) {
    return ctx.options().tools?.[tool.name] ?? {};
}
function textView() {
    const node = el('p', 'text');
    return { node, update(item) { node.hidden = !item.text; setText(node, item.text); } };
}
function reasoningView(first, ctx) {
    const f = fold('reasoning');
    const body = el('div', 'reasoning-body');
    f.node.append(body);
    f.node.open = ctx.options().expandReasoning ?? (ctx.run()?.status === 'streaming' && !!first.streaming);
    let wasLive = false, startedAt, elapsed, timer, current = first;
    const drawTime = () => {
        const duration = durationLabel(current.durationMs ?? (startedAt === undefined ? elapsed : Date.now() - startedAt));
        setText(f.label, wasLive ? 'Thinking…' : current.streaming ? 'Thinking interrupted' : duration ? `Thought for ${duration}` : 'Thought');
        setText(f.meta, wasLive ? duration : '');
    };
    let hasContent = !!first.text;
    f.head.addEventListener('click', event => { if (!hasContent)
        event.preventDefault(); });
    return { node: f.node, update(item) {
            const live = ctx.run()?.status === 'streaming' && !!item.streaming;
            current = item;
            if (live && !wasLive) {
                startedAt = Date.now();
                f.node.open = true;
                timer = setInterval(drawTime, 1000);
            } else if (!live && wasLive) {
                elapsed = Date.now() - startedAt;
                startedAt = undefined;
                clearInterval(timer);
                f.node.open = false;
            }
            wasLive = live;
            hasContent = !!item.text.trim();
            f.node.hidden = !hasContent && !live && elapsed === undefined && item.durationMs === undefined;
            f.head.setAttribute('aria-disabled', String(!hasContent));
            f.head.title = 'Reasoning summary';
            f.chevron.hidden = !hasContent;
            f.node.dataset.live = String(live);
            drawTime();
            setText(body, item.text);
        }, dispose() { clearInterval(timer); } };
}
function payload(label, ctx) {
    const node = el('section', 'payload');
    const head = el('div', 'payload-head');
    const caption = el('span');
    caption.textContent = label;
    const copy = button('Copy', 'quiet-button');
    const pre = el('pre');
    pre.tabIndex = 0;
    pre.setAttribute('aria-label', label);
    const more = button('Show more', 'quiet-button more');
    const notice = el('span', 'sr-only');
    notice.setAttribute('role', 'status');
    head.append(caption, copy, notice);
    node.append(head, pre, more);
    let value = '', limit = 12000;
    const draw = () => {
        setText(pre, value.slice(0, limit));
        more.hidden = value.length <= limit;
        more.textContent = `Show more (${(value.length - limit).toLocaleString()} characters remaining)`;
    };
    copy.addEventListener('click', async () => {
        try {
            if (!navigator.clipboard)
                throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(value);
            copy.textContent = 'Copied';
            notice.textContent = `${label} copied`;
        }
        catch {
            notice.textContent = 'Copy failed. Select the output and copy it manually.';
            copy.textContent = 'Copy failed';
        }
    });
    more.addEventListener('click', () => { limit += 48000; draw(); });
    return { node, update(text, isError = false) {
            if (!value)
                limit = Math.max(1000, ctx.options().outputPreviewChars ?? 12000);
            if (value !== text) {
                copy.textContent = 'Copy';
                notice.textContent = '';
            }
            value = text;
            node.classList.toggle('error', isError);
            caption.textContent = isError ? 'Error' : label;
            draw();
        } };
}
function toolView(first, ctx) {
    const node = el('div', 'tool-event');
    node.dataset.toolId = first.id;
    const f = fold('tool');
    const icon = el('span', 'tool-icon');
    icon.setAttribute('aria-hidden', 'true');
    const hint = el('span', 'hint');
    f.head.prepend(icon);
    f.head.insertBefore(hint, f.meta);
    const body = el('div', 'tool-body');
    const input = payload('Input', ctx), output = payload('Output', ctx);
    body.append(input.node, output.node);
    f.node.append(body);
    const approval = el('div', 'approval');
    approval.setAttribute('role', 'group');
    const approvalReason = el('p', 'approval-reason');
    const actions = el('div', 'approval-actions');
    const deny = button('Deny', 'action'), allow = button('Allow', 'action');
    const approvalNote = el('span', 'approval-note');
    approvalNote.setAttribute('role', 'status');
    actions.append(deny, allow, approvalNote);
    approval.append(approvalReason, actions);
    const assets = el('div', 'artifacts');
    const assetList = new KeyedList(assets, item => assetView(item, ctx));
    const formatError = el('p', 'format-error');
    node.append(f.node, approval, assets, formatError);
    let current = first;
    let active = true, busy = false, sent = '', requestId = '', localError = '';
    const firstState = toolStatus(first, ctx.run()?.status ?? 'idle');
    f.node.open = firstState === 'Failed' || firstState === 'Approval required' ||
        (presentation(ctx, first).kind === 'terminal' && ctx.run()?.status === 'streaming');
    const drawPayload = () => {
        if (!f.node.open)
            return; // Do not serialize invisible logs on every token.
        const ui = presentation(ctx, current);
        input.node.hidden = current.input === undefined;
        output.node.hidden = current.output === undefined && current.state !== 'output-error';
        try {
            if (!input.node.hidden)
                input.update(ui.formatInput ? ui.formatInput(current.input) : formatValue(current.input));
            if (!output.node.hidden)
                output.update(current.state === 'output-error'
                    ? current.errorText ?? 'The tool failed without an error description.'
                    : ui.formatOutput ? ui.formatOutput(current.output) : formatValue(current.output), current.state === 'output-error');
        }
        catch {
            setText(formatError, 'The custom tool formatter failed. Check your presentation callback.');
            formatError.hidden = false;
        }
    };
    const drawApproval = () => {
        const requested = current.state === 'approval-requested';
        approval.hidden = !requested;
        if (!requested)
            return;
        approval.setAttribute('aria-label', `Approval for ${current.title ?? current.name}`);
        approvalReason.textContent = current.approval?.reason ?? '';
        approvalReason.hidden = !approvalReason.textContent;
        const connected = !!ctx.approval();
        deny.disabled = allow.disabled = !connected || !current.approval?.id || busy || sent === requestId;
        approvalNote.textContent = localError || (busy ? 'Sending…' : sent === requestId ? 'Decision sent'
            : !connected ? 'Approval handler not connected' : !current.approval?.id ? 'Approval data unavailable' : '');
    };
    const decide = async (approved) => {
        const handler = ctx.approval();
        const id = current.approval?.id;
        if (!handler || !id || busy || sent === id || current.state !== 'approval-requested')
            return;
        busy = true;
        localError = '';
        drawApproval();
        try {
            await handler({ id, approved });
            if (active && requestId === id)
                sent = id;
        }
        catch (error) {
            if (active && requestId === id)
                localError = error instanceof Error ? error.message : 'Could not send the decision.';
        }
        finally {
            if (active && requestId === id) {
                busy = false;
                drawApproval();
            }
        }
    };
    deny.addEventListener('click', () => void decide(false));
    allow.addEventListener('click', () => void decide(true));
    f.node.addEventListener('toggle', drawPayload);
    return { node, update(item) {
            current = item;
            const ui = presentation(ctx, item);
            if (requestId !== (item.approval?.id ?? '')) {
                requestId = item.approval?.id ?? '';
                sent = '';
                busy = false;
                localError = '';
            }
            const state = toolStatus(item, ctx.run()?.status ?? 'idle');
            const live = ctx.run()?.status === 'streaming' && toolIsPending(item);
            node.dataset.live = String(live);
            node.dataset.state = item.state;
            setText(icon, ui.kind === 'terminal' ? '›_' : ui.kind === 'search' ? '⌕' : '');
            icon.hidden = !icon.textContent;
            setText(f.label, item.title ?? ui.label ?? item.name);
            formatError.hidden = true;
            try {
                setText(hint, ui.summary?.(item) ?? '');
            }
            catch {
                setText(hint, '');
                formatError.hidden = false;
                setText(formatError, 'The custom summary formatter failed.');
            }
            f.head.title = `${f.label.textContent}${hint.textContent ? ` — ${hint.textContent}` : ''}`;
            const duration = durationLabel(item.durationMs);
            setText(f.meta, state === 'Completed' ? duration : `${state}${duration ? ` · ${duration}` : ''}`);
            f.head.setAttribute('aria-label', `${f.label.textContent}. ${state}${duration ? `. ${duration}` : ''}`);
            drawPayload();
            drawApproval();
            try {
                assetList.update(item.state === 'output-available' ? ui.assets?.(item) ?? [] : []);
            }
            catch {
                formatError.hidden = false;
                setText(formatError, 'The custom artifact mapper failed.');
                assetList.update([]);
            }
            assets.hidden = !assets.childElementCount;
        }, dispose() { active = false; assetList.clear(); } };
}
function groupView(first, ctx) {
    const f = fold('group');
    const body = el('div', 'group-body');
    f.node.append(body);
    f.node.open = ctx.options().expandGroups ?? true;
    const list = new KeyedList(body, item => toolView(item, ctx));
    f.node.dataset.groupId = first.id;
    return { node: f.node, update(group) {
            const live = ctx.run()?.status === 'streaming' && group.tools.some(toolIsPending);
            const done = group.tools.every(item => (item.state === 'output-available' && !item.preliminary) ||
                item.state === 'output-error' || item.state === 'output-denied' ||
                (item.state === 'approval-responded' && item.approval?.approved === false));
            const searches = group.tools.every(item => presentation(ctx, item).kind === 'search');
            const count = group.tools.length;
            const noun = searches ? `search${count === 1 ? '' : 'es'}` : `tool${count === 1 ? '' : 's'}`;
            const verb = live ? searches ? 'Exploring' : 'Using' : done ? searches ? 'Explored' : 'Used' : 'Activity ·';
            setText(f.label, group.tools.every(item => presentation(ctx, item).kind === 'activity') ? (live ? 'Building UI' : 'Build activity') : `${verb} ${count} ${noun}`);
            const failures = group.tools.filter(item => item.state === 'output-error').length;
            const waiting = group.tools.some(item => item.state === 'approval-requested');
            const interrupted = ctx.run()?.status === 'interrupted' && group.tools.some(toolIsPending);
            setText(f.meta, [failures ? `${failures} failed` : '', waiting ? 'Approval required' : '', interrupted ? 'Interrupted' : ''].filter(Boolean).join(' · '));
            f.node.dataset.live = String(live);
            list.update(group.tools);
        }, dispose() { list.clear(); } };
}
function assetView(first, ctx) {
    const node = el('figure', 'artifact');
    node.dataset.assetId = first.id;
    const preview = button('', 'asset-preview');
    const image = el('img');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    const fallback = el('span', 'asset-fallback');
    preview.append(image, fallback);
    const caption = el('figcaption');
    const link = el('a', 'asset-link');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.referrerPolicy = 'no-referrer';
    const dimensions = el('span', 'dimensions');
    caption.append(link, dimensions);
    node.append(preview, caption);
    let current = first, lastURL = null, loaded = false;
    const imageTitle = () => current.alt ?? current.filename ?? 'Image';
    image.addEventListener('load', () => {
        loaded = true;
        preview.dataset.loaded = 'true';
        image.hidden = false;
        fallback.hidden = true;
        preview.disabled = false;
        setText(dimensions, `${image.naturalWidth} × ${image.naturalHeight}`);
    });
    image.addEventListener('error', () => {
        loaded = false;
        image.hidden = true;
        fallback.hidden = false;
        preview.disabled = true;
        setText(fallback, 'Image unavailable');
        setText(dimensions, '');
    });
    preview.addEventListener('click', () => { if (lastURL && loaded)
        ctx.openAsset(current, lastURL); });
    return { node, update(asset) {
            current = asset;
            const isImage = asset.mediaType === 'image' || asset.mediaType.startsWith('image/');
            preview.hidden = !isImage;
            const url = safeURL(asset.url, document.baseURI, isImage, ctx.options().assetOrigins);
            const externalLink = safeURL(asset.url, document.baseURI);
            if (externalLink)
                link.href = externalLink;
            else
                link.removeAttribute('href');
            setText(link, asset.filename ?? (isImage ? 'Image' : 'File'));
            image.alt = imageTitle();
            preview.setAttribute('aria-label', `Preview ${imageTitle()}`);
            if (!isImage) {
                setText(dimensions, asset.mediaType);
                return;
            }
            if (url !== lastURL || !url) {
                lastURL = url;
                loaded = false;
                preview.dataset.loaded = 'false';
                image.hidden = !url;
                fallback.hidden = false;
                preview.disabled = true;
                setText(dimensions, '');
                if (url) {
                    setText(fallback, 'Loading image…');
                    image.src = url;
                }
                else {
                    image.removeAttribute('src');
                    setText(fallback, 'Image preview blocked');
                }
            }
            const hasSize = asset.width && asset.height && asset.width > 0 && asset.height > 0 && Number.isFinite(asset.width / asset.height);
            preview.style.aspectRatio = hasSize ? `${asset.width} / ${asset.height}` : '4 / 3';
        } };
}
function sourceView() {
    const node = el('p', 'source');
    const link = el('a');
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    link.referrerPolicy = 'no-referrer';
    node.append(link);
    return { node, update(item) {
            setText(link, item.title);
            const url = item.url ? safeURL(item.url, document.baseURI) : null;
            if (url)
                link.href = url;
            else
                link.removeAttribute('href');
        } };
}
/** Register explicitly; importing this module is safe during server rendering. */
export function defineAgentFlow(tagName = 'agent-flow') {
    if (typeof window === 'undefined' || !window.customElements || customElements.get(tagName))
        return;
    class Element extends HTMLElement {
        value = null;
        settings = {};
        approvalHandler;
        list;
        footer = el('p', 'footer');
        live = el('p', 'sr-only');
        dialog = el('dialog', 'image-dialog');
        fullImage = el('img');
        imageCaption = el('p');
        activeRunId = '';
        constructor() {
            super();
            const root = this.attachShadow({ mode: 'open' });
            const css = el('style');
            css.textContent = AGENT_FLOW_CSS;
            const flow = el('div', 'flow');
            flow.setAttribute('role', 'region');
            flow.setAttribute('aria-label', 'Agent activity');
            this.live.setAttribute('role', 'status');
            this.live.setAttribute('aria-live', 'polite');
            this.live.setAttribute('aria-atomic', 'true');
            const close = button('Close', 'action');
            close.setAttribute('aria-label', 'Close image preview');
            close.autofocus = false;
            close.addEventListener('click', () => this.dialog.close());
            this.fullImage.referrerPolicy = 'no-referrer';
            this.dialog.setAttribute('aria-label', 'Image preview');
            this.dialog.append(close, this.fullImage, this.imageCaption);
            this.dialog.addEventListener('click', event => {
                if (event.target !== this.dialog)
                    return;
                const rect = this.dialog.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
                    this.dialog.close();
            });
            this.fullImage.addEventListener('error', () => { this.imageCaption.textContent = 'Image unavailable. The file may have expired.'; });
            root.append(css, flow, this.footer, this.live, this.dialog);
            const ctx = {
                run: () => this.value, options: () => this.settings, approval: () => this.approvalHandler,
                openAsset: (asset, url) => {
                    this.fullImage.src = url;
                    this.fullImage.alt = asset.alt ?? asset.filename ?? 'Image';
                    this.imageCaption.textContent = asset.filename ?? '';
                    if (!this.dialog.open)
                        this.dialog.showModal();
                },
            };
            this.list = new KeyedList(flow, block => {
                if (block.type === 'group')
                    return groupView(block, ctx);
                if (block.type === 'reasoning')
                    return reasoningView(block, ctx);
                if (block.type === 'source')
                    return sourceView();
                if (block.type === 'asset') {
                    const asset = assetView(block.asset, ctx);
                    return { node: asset.node, update: item => asset.update(item.asset) };
                }
                return textView();
            });
        }
        connectedCallback() {
            // Upgrade properties assigned before customElements.define().
            for (const property of ['options', 'onApproval', 'run']) {
                if (Object.prototype.hasOwnProperty.call(this, property)) {
                    const value = this[property];
                    Reflect.deleteProperty(this, property);
                    Reflect.set(this, property, value);
                }
            }
            this.render();
        }
        disconnectedCallback() { this.list.clear(); if (this.dialog.open)
            this.dialog.close(); }
        get run() { return this.value; }
        set run(value) {
            if (value && (!value.id || !Array.isArray(value.events)))
                throw new TypeError('Expected an AgentRun with a stable id and events array.');
            this.value = value;
            this.render();
        }
        get options() { return this.settings; }
        set options(value) { if (this.settings === value)
            return; this.settings = value ?? {}; this.render(); }
        get onApproval() { return this.approvalHandler; }
        set onApproval(value) {
            const capabilityChanged = !!value !== !!this.approvalHandler;
            this.approvalHandler = value;
            if (capabilityChanged)
                this.render();
        }
        render() {
            if (!this.list)
                return;
            const run = this.value;
            if (run?.id !== this.activeRunId) {
                this.list.clear();
                if (this.dialog.open)
                    this.dialog.close();
                this.activeRunId = run?.id ?? '';
            }
            this.list.update(blocks(run?.events ?? []));
            const tools = run?.events.filter((event) => event.type === 'tool') ?? [];
            const waiting = tools.some(item => item.state === 'approval-requested');
            const running = run?.status === 'streaming';
            const hasActivePart = tools.some(toolIsPending) || run?.events.some(event => (event.type === 'text' || event.type === 'reasoning') && event.streaming);
            const footer = run?.status === 'error' ? run.error || 'The response could not be completed.'
                : run?.status === 'interrupted' ? 'Stopped'
                    : running && !hasActivePart && !waiting ? 'Working…' : '';
            this.footer.hidden = !footer;
            setText(this.footer, footer);
            this.footer.dataset.live = String(running);
            this.footer.dataset.error = String(run?.status === 'error');
            const last = tools.at(-1);
            const announcement = !run ? '' : waiting ? 'Approval required'
                : run.status === 'interrupted' ? 'Agent stopped'
                    : run.status === 'error' ? footer
                        : last ? `${tools.length} tool ${tools.length === 1 ? 'call' : 'calls'}. ${last.title ?? last.name}: ${toolStatus(last, run.status)}`
                            : running ? 'Agent responding' : '';
            setText(this.live, announcement);
        }
    }
    customElements.define(tagName, Element);
}
