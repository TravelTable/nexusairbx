import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Loader2, Monitor, PlugZap, Sparkles } from 'lib/icons';
import { useRobloxConnection } from '../context/RobloxConnectionContext';
import { useStudioConnection } from '../hooks/useStudioConnection';
import { useGuidedLaunch } from '../components/onboarding/useGuidedLaunch';
import { Button } from '../components/shadcn/button';
import { beginRobloxOAuth, ROBLOX_PRODUCT_DEFAULT_CAPABILITIES } from '../lib/robloxOAuthApi';
import { startStudioPairing } from '../lib/studioBridgeApi';
import { resolvePairingExpiry } from '../components/ai/StudioPairControl';
import { getStudioSetupVisual } from '../components/onboarding/StudioSetupVisual';
import { consumeGuidedLaunchSource, guidedLaunchSource, guidedLaunchPath, guidedWorkspacePath, openGuidedWorkspace, restartGuidedLaunch, startGuidedLaunch } from '../lib/guidedLaunchApi';
import { safeSignupReturnPath } from '../lib/signupRobloxOnboarding';
import { readPendingAuthAction } from '../lib/pendingAuthAction';
import { restoreGenerationIntent } from '../lib/generationIntent';
import { trackProductEvent } from '../lib/productAnalytics';
import '../components/onboarding/GuidedLaunch.css';

const EXAMPLES = ['A cozy café where players serve their friends', 'An obstacle course with moving platforms', 'A haunted hotel with a mystery to solve'];
const TITLES = { idea: 'What do you want to make?', roblox: 'Let’s connect your tools', studio: 'Bring your idea into Studio' };

export default function OnboardingPage() {
  const roblox = useRobloxConnection();
  const location = useLocation();
  if (!roblox.authReady) return <div className="guided-launch-loading" role="status">Loading your workspace…</div>;
  if (!roblox.user) return <Navigate to="/signin" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  if (!roblox.user.emailVerified) return <Navigate to="/verify-email" replace state={{ returnPath: `${location.pathname}${location.search}` }} />;
  return <GuidedLaunchSetup key={roblox.user.uid} roblox={roblox} />;
}

export function GuidedLaunchSetup({ roblox }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const launch = useGuidedLaunch(roblox.user.uid);
  const studio = useStudioConnection();
  const refreshStudio = studio.refresh;
  const refreshRoblox = roblox.refresh;
  const draftKey = `nexusrbx:guided-launch-draft:v1:${roblox.user.uid}`;
  const [idea, setIdea] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [pair, setPair] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const restored = useRef(false);
  const heading = useRef(null);
  const progress = launch.progress;
  const stage = progress?.stage || 'idea';
  const setupStage = ['idea', 'roblox', 'studio'].includes(stage) ? stage : 'studio';
  const studioStep = progress?.studioStep || 'place';
  const returnPath = safeSignupReturnPath(progress?.returnPath || params.get('return'), '/ai');
  const accountReady = roblox.connected && !roblox.error && !['checking', 'refreshing'].includes(roblox.phase) && roblox.status?.onboarding?.gateActive !== true;
  const studioReady = studio.executionReady === true && !studio.loading;
  const workspaceReady = Boolean(progress?.chatId);
  const callbackError = params.get('roblox') === 'error' ? params.get('message') || 'Roblox connection was cancelled. Try again when you’re ready.' : '';

  useEffect(() => {
    if (launch.loading || restored.current) return;
    restored.current = true;
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(draftKey)); } catch (_) {}
    setIdea(draft?.idea && draft.updatedAt > (progress?.updatedAt || 0) ? draft.idea : progress?.idea || readPendingAuthAction()?.payload?.prompt || restoreGenerationIntent()?.prompt || '');
  }, [launch.loading, progress?.idea, progress?.updatedAt, draftKey]);
  useEffect(() => { heading.current?.focus(); }, [launch.loading, setupStage, studioStep]);
  useEffect(() => {
    if (params.get('roblox') === 'connected') void refreshRoblox({ force: true }).catch(() => setError('We couldn’t check your connection. Try connecting again.'));
  }, [params, refreshRoblox]);
  useEffect(() => {
    if (!pair || studioReady) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pair, studioReady]);
  useEffect(() => {
    if (!pair || studioReady || pair.expiresAt <= Date.now()) return;
    const timer = setInterval(() => { void refreshStudio({ force: false }); }, 5000);
    return () => clearInterval(timer);
  }, [pair, studioReady, refreshStudio]);

  const editIdea = value => {
    setIdea(value);
    try { localStorage.setItem(draftKey, JSON.stringify({ idea: value, updatedAt: Date.now() })); } catch (_) {}
  };

  const act = async (operation) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError('');
    try { await operation(); }
    catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      void trackProductEvent('onboarding_connection_failed', { stage: setupStage, error_category: 'setup_action_failed' });
    } finally { busyRef.current = false; setBusy(false); }
  };
  const ensureProgress = async () => {
    if (progress) return progress;
    return launch.accept(await startGuidedLaunch({ ...guidedLaunchSource(), idea, returnPath }));
  };
  const save = async (patch) => {
    await ensureProgress();
    const saved = await launch.save(patch);
    if (patch.idea !== undefined) { try { localStorage.removeItem(draftKey); } catch (_) {} }
    return saved;
  };
  const next = (patch) => act(async () => {
    await save(patch);
    void trackProductEvent('onboarding_stage_completed', { stage: setupStage });
  });
  const connect = () => act(async () => {
    await save({ idea, stage: 'roblox', dismissed: false });
    const clean = new URLSearchParams(params); clean.delete('roblox'); clean.delete('message'); setParams(clean, { replace: true });
    const result = await beginRobloxOAuth({ capabilities: ROBLOX_PRODUCT_DEFAULT_CAPABILITIES, returnPath: guidedLaunchPath(returnPath) });
    if (result?.authorized) await roblox.refresh({ force: true });
  });
  const enterWorkspace = () => act(async () => {
    const fresh = await studio.refresh({ force: true });
    if (!fresh?.executionReady) throw new Error('Reconnect Studio before continuing. Your idea is saved.');
    if (fresh.sessionId !== studio.sessionId || fresh.activePlaceName !== studio.activePlaceName) throw new Error('The connected place changed. Confirm the place shown here, then continue.');
    const result = await openGuidedWorkspace();
    consumeGuidedLaunchSource(result);
    navigate(guidedWorkspacePath(result));
  });
  const pause = () => act(async () => {
    await save({ idea, dismissed: true });
    void trackProductEvent('onboarding_paused', { stage });
    navigate(returnPath.startsWith('/onboarding') || returnPath.startsWith('/connect-roblox') ? '/ai' : returnPath);
  });
  const generateCode = () => act(async () => {
    await save({ studioStep: 'pair' });
    const result = await startStudioPairing();
    if (!result.code) throw new Error('A pairing code could not be created. Try again.');
    setPair({ code: String(result.code).toUpperCase(), expiresAt: resolvePairingExpiry(result) });
    setNow(Date.now()); setCopied(false);
  });
  const visual = getStudioSetupVisual(studioStep === 'pair' ? 'enter-pair-code' : studioStep === 'plugin' ? 'open-plugin' : 'install-plugin');
  const restart = () => act(async () => { launch.accept(await restartGuidedLaunch()); editIdea(''); setPair(null); });

  if (launch.loading) return <div className="guided-launch-loading" role="status">Finding your saved progress…</div>;
  if (launch.error) return <div className="guided-launch-loading"><p role="alert">{launch.error}</p><Button onClick={launch.refresh}>Try again</Button></div>;

  return (
    <div className="guided-launch" data-nexus-surface="onboarding">
      <header className="guided-launch-header">
        <Link to="/" className="guided-launch-brand" aria-label="NexusRBX home"><span aria-hidden="true">N</span>NexusRBX</Link>
        <span className="guided-launch-save">{busy ? 'Saving…' : idea !== (progress?.idea || '') ? 'Continue to save your idea to your account' : progress ? 'Progress saved to your account' : 'Your first creation starts here'}</span>
        <Button variant="ghost" disabled={busy} onClick={pause}>Save and leave</Button>
      </header>
      <main className="guided-launch-main" id="main-content">
        <nav aria-label="Guided Launch progress"><ol className="guided-launch-steps">
          {['Your idea', 'Your tools', 'First creation'].map((label, index) => {
            const current = workspaceReady ? 2 : setupStage === 'idea' ? 0 : 1;
            return <li key={label} aria-current={index === current ? 'step' : undefined} data-complete={index < current}><span>{index < current ? <Check size={14} /> : index + 1}</span>{label}</li>;
          })}
        </ol></nav>
        <div className="guided-launch-grid">
          <section className="guided-launch-content">
            <p className="guided-launch-eyebrow">GUIDED LAUNCH</p>
            <h1 tabIndex={-1} ref={heading}>{workspaceReady ? 'Your creation is waiting' : TITLES[setupStage]}</h1>
            {setupStage !== 'idea' && !workspaceReady && <p className="guided-launch-description">Your idea is saved. A few connections will let Nexus work alongside you.</p>}
            {(error || callbackError) && <div role="alert" className="guided-launch-error">{error || callbackError}{/another tab|restarted/i.test(error) && <Button variant="ghost" onClick={launch.refresh}>Reload progress</Button>}</div>}

            {workspaceReady ? <>
              <p className="guided-launch-description">Continue in the same conversation, with your idea and build progress intact.</p>
              <blockquote className="guided-launch-idea">{progress.idea}</blockquote>
              <Button className="guided-launch-primary" onClick={() => act(async () => { const resumed = await save({ dismissed: false }); consumeGuidedLaunchSource(resumed); navigate(guidedWorkspacePath(resumed)); })} disabled={busy}>Continue my creation <ArrowRight size={16} /></Button>
              <Button variant="ghost" onClick={restart} disabled={busy}>Start a new guided creation</Button>
            </> : setupStage === 'idea' ? <form onSubmit={e => { e.preventDefault(); if (idea.trim()) next({ idea: idea.trim(), stage: 'roblox', dismissed: false }); }}>
              <p className="guided-launch-description">A game, a mechanic, a world. Tell us what’s in your head—we’ll help you bring the first playable part to life.</p>
              <label className="guided-launch-label" htmlFor="launch-idea">Your idea</label>
              <textarea id="launch-idea" value={idea} maxLength={12000} onChange={e => editIdea(e.target.value)} placeholder="I want to make a game where…" required rows={5} />
              <div className="guided-launch-examples"><span>Need a starting point?</span>{EXAMPLES.map(example => <button type="button" key={example} onClick={() => editIdea(example)}>{example}<ArrowRight size={14} /></button>)}</div>
              <Button type="submit" className="guided-launch-primary" disabled={!idea.trim() || busy}>Continue with this idea <ArrowRight size={16} /></Button>
            </form> : setupStage === 'roblox' ? <>
              <div className="guided-launch-tool"><PlugZap size={22} /><div><h2>1. Your Roblox account</h2><p>Connect your identity and give Nexus access to your creation tools.</p></div>{accountReady && <Check className="guided-launch-success" />}</div>
              <ul className="guided-launch-permissions"><li>Confirm your Roblox identity</li><li>Read and upload Roblox assets</li><li>Search the Creator Store</li></ul>
              <p className="guided-launch-hint">Roblox shows the exact permissions before you approve. Connecting your account is separate from connecting the place open in Studio.</p>
              <Button className="guided-launch-primary" disabled={busy || roblox.phase === 'checking'} onClick={accountReady ? () => next({ stage: 'studio' }) : connect}>{busy || roblox.phase === 'checking' ? <Loader2 className="animate-spin" size={16} /> : accountReady ? <Check size={16} /> : <PlugZap size={16} />}{accountReady ? 'Continue to Studio setup' : 'Connect Roblox'}</Button>
              <Button variant="ghost" onClick={() => next({ stage: 'idea' })} disabled={busy}><ArrowLeft size={15} /> Back to my idea</Button>
            </> : <>
              <div className="guided-launch-tool"><Monitor size={22} /><div><h2>2. Your Roblox Studio place</h2><p>{studioReady ? 'Connected and ready for your first creation.' : 'This is where your creation will come to life.'}</p></div>{studioReady && <Check className="guided-launch-success" />}</div>
              {!accountReady ? <><p className="guided-launch-error">Reconnect your Roblox account to continue.</p><Button className="guided-launch-primary" onClick={connect} disabled={busy}>Reconnect Roblox</Button></> : studioReady ? <>
                <div className="guided-launch-place"><span className="guided-launch-status-dot" /><div><span>CONNECTED PLACE</span><strong>{studio.activePlaceName || 'Untitled Studio place'}</strong></div><Check size={18} /></div>
                <p className="guided-launch-hint">Confirm this is the place you want to use. If it isn’t, open the right place in Studio, connect it, then check again.</p>
                <Button className="guided-launch-primary" disabled={busy} onClick={enterWorkspace}>Use this place and plan my creation <ArrowRight size={16} /></Button>
                <Button variant="ghost" disabled={busy} onClick={() => act(() => studio.refresh({ force: true }))}>Check connected place again</Button>
              </> : <>
                {studio.connected && <div role="status" className="guided-launch-error">Your connection needs attention. Update the NexusRBX plugin from Downloads, reopen it, and reconnect before building.</div>}
                <p className="guided-launch-mobile-note">Studio setup happens on a desktop computer. Your idea is saved to your account so you can continue there.</p>
                {studioStep === 'place' ? <>
                  <h3>{progress?.placeChoice === 'existing' ? 'Open your existing place' : 'Start with a fresh baseplate'}</h3>
                  <p className="guided-launch-description">{progress?.placeChoice === 'existing' ? 'Open the experience you want to work on in Roblox Studio. Nexus will inspect it before proposing changes.' : 'Open Roblox Studio and choose Baseplate from the new experience templates. This gives your idea room to grow.'}</p>
                  <a className="guided-launch-link" href="https://create.roblox.com/docs/studio/setup" target="_blank" rel="noreferrer">Get Roblox Studio <ExternalLink size={14} /></a>
                  <Button className="guided-launch-primary" onClick={() => next({ studioStep: 'plugin' })} disabled={busy}>My place is open <ArrowRight size={16} /></Button>
                  <Button variant="ghost" onClick={() => next({ placeChoice: progress?.placeChoice === 'existing' ? 'new' : 'existing' })} disabled={busy}>{progress?.placeChoice === 'existing' ? 'Use a new baseplate instead' : 'Use an existing place'}</Button>
                </> : studioStep === 'plugin' ? <>
                  <h3>Add Nexus to Studio</h3><p className="guided-launch-description">Get the NexusRBX Studio plugin from Downloads. In Studio, open the Plugins tab and select NexusRBX.</p>
                  <a href="/downloads" target="_blank" rel="noreferrer" className="guided-launch-link">Get the NexusRBX plugin <ExternalLink size={14} /></a>
                  <Button className="guided-launch-primary" onClick={() => next({ studioStep: 'pair' })} disabled={busy}>The plugin is open <ArrowRight size={16} /></Button>
                  <Button variant="ghost" onClick={() => next({ studioStep: 'pair' })} disabled={busy}>I already have the plugin</Button>
                </> : <>
                  <h3>Connect this browser to Studio</h3><p className="guided-launch-description">Generate a one-time code, then paste it into the NexusRBX plugin and select Connect.</p>
                  {pair && pair.expiresAt > now ? <>
                    <div className="guided-launch-code"><code aria-label="Pairing code">{pair.code}</code><Button variant="outline" onClick={() => act(async () => { await navigator.clipboard.writeText(pair.code); setCopied(true); })} disabled={busy}><Copy size={16} />{copied ? 'Copied' : 'Copy code'}</Button></div>
                    <p role="status" className="guided-launch-hint">Waiting for Studio… Code expires in {Math.max(1, Math.ceil((pair.expiresAt - now) / 1000))} seconds.</p>
                    <Button variant="outline" onClick={() => act(() => studio.refresh({ force: true }))} disabled={busy}>I entered the code · check connection</Button>
                  </> : <><p role="status" className="guided-launch-hint">{pair ? 'That code expired. Generate a new one to continue.' : 'Generate the code when your plugin is open.'}</p><Button className="guided-launch-primary" onClick={generateCode} disabled={busy}>{pair ? 'Generate a new code' : 'Generate pairing code'}</Button></>}
                  <details className="guided-launch-help"><summary>Studio isn’t connecting?</summary><p>If Studio asks, allow the NexusRBX host. If HTTP requests are blocked, open Game Settings → Security and enable Allow HTTP Requests. Check that the plugin is up to date and both apps use the same Nexus account.</p><a href="/downloads" target="_blank" rel="noreferrer">Plugin downloads and setup</a></details>
                </>}
                <Button variant="ghost" disabled={busy} onClick={() => next(studioStep === 'place' ? { stage: 'roblox' } : { studioStep: studioStep === 'pair' ? 'plugin' : 'place' })}><ArrowLeft size={15} /> Back</Button>
              </>}
            </>}
          </section>
          <aside className="guided-launch-aside" aria-label="Your creation journey">
            <div className="guided-launch-aside-top"><Sparkles size={18} /><span>FROM IDEA TO SOMETHING PLAYABLE</span></div>
            <div className="guided-launch-illustration" aria-hidden="true"><svg viewBox="0 0 320 210" className="guided-launch-world">
              <path d="M34 135 160 72 286 135 160 198Z" fill="var(--ds-surface-2)" stroke="var(--ds-border-strong)" />
              <g stroke="var(--ds-border)" fill="none"><path d="m65 119 126 63m-95-79 126 63m-95-79 126 63M65 151l126-63m-95 79 126-63m-95 79 126-63" /></g>
              <path d="m108 108 39-20 39 20-39 20Z" fill="var(--ds-accent)" /><path d="m108 108 39 20v42l-39-20Z" fill="var(--ds-accent)" opacity=".65" /><path d="m147 128 39-20v42l-39 20Z" fill="var(--ds-accent)" opacity=".4" />
              <path d="m196 105 25-13 25 13-25 13Z" fill="var(--ds-text-muted)" /><path d="m196 105 25 13v27l-25-13Z" fill="var(--ds-text-muted)" opacity=".4" /><path d="m221 118 25-13v27l-25 13Z" fill="var(--ds-text-muted)" opacity=".22" />
              <path d="m126 54 21-11 22 11-22 11Zm0 0v23l21 11 22-11V54m-22 11v23" fill="none" stroke="var(--ds-accent)" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M247 42v16m-8-8h16M78 79v10m-5-5h10" stroke="var(--ds-text-muted)" strokeWidth="1.5" />
            </svg><span className="guided-launch-orbit">YOUR NEXT IDEA</span></div>
            <h2>{setupStage === 'idea' ? 'Big idea. Small first step.' : 'Your idea comes with you.'}</h2>
            <p>{idea ? 'We’ll keep the bigger picture and help you build one playable part first.' : 'You don’t need a finished plan. Start with a spark and shape it as you go.'}</p>
            {idea && <blockquote className="guided-launch-idea">{idea}</blockquote>}
            {setupStage === 'studio' && visual.assetAvailable && !imageFailed && <figure><img src={visual.src} alt={visual.alt} onError={() => setImageFailed(true)} /><figcaption>{visual.title} · Setup reference</figcaption></figure>}
            <ol className="guided-launch-outcomes"><li><span>01</span>Shape your first playable milestone</li><li><span>02</span>Watch it take shape in Studio</li><li><span>03</span>Try it, then make it your own</li></ol>
          </aside>
        </div>
      </main>
      <footer className="guided-launch-footer">Your idea stays yours. You decide what gets built.</footer>
    </div>
  );
}
