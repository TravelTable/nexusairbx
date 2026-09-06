import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../shadcn/button';
import { firstMilestonePrompt } from '../../lib/guidedLaunchApi';
import { guidedBuildEvidence, milestoneTestInstructions } from '../../lib/guidedLaunchEvidence';
import { trackProductEvent } from '../../lib/productAnalytics';
import './GuidedLaunch.css';

export default function GuidedLaunchChecklist({ launch, chat, studio, run, task, isBusy, setPrompt, onSubmit, onOpenSetup }) {
  const { progress, save } = launch;
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const lock = useRef(false);
  const syncKey = useRef('');
  const bound = Boolean(progress?.chatId && progress.chatId === chat.currentChatId && !progress.dismissed);
  const plan = [...(chat.messages || [])].reverse().find(m => m.stage === 'plan' || m.stage === 'plan_approved');
  const evidence = bound ? guidedBuildEvidence(chat.messages, run?.chatId === chat.currentChatId ? run : null) : { applied: false };
  evidence.applied = evidence.applied && !isBusy && Boolean(evidence.evidenceId) && evidence.evidenceId !== progress?.ignoredEvidenceId;
  const hasRequest = (chat.messages || []).some(m => m.role === 'user');
  const stage = progress?.stage || 'plan';
  const tests = milestoneTestInstructions(plan);
  const disabled = working || isBusy;
  const ready = studio?.executionReady === true;
  const samePlace = !evidence.sessionId || evidence.sessionId === studio?.sessionId;
  const operation = async (fn) => {
    if (lock.current) return;
    lock.current = true; setWorking(true); setError('');
    try { await fn(); } catch (err) { setError(err.message || 'Could not save your progress. Please try again.'); }
    finally { lock.current = false; setWorking(false); }
  };
  useEffect(() => {
    if (!bound || stage === 'complete' || !evidence.applied || stage === 'try') return;
    const key = `${progress.launchId}:${evidence.evidenceId}`;
    if (syncKey.current === key) return;
    syncKey.current = key;
    save({ stage: 'try', taskId: evidence.taskId || task?.taskId || '' }).then(() => {
      void trackProductEvent('onboarding_first_apply', { stage: 'try' });
    }).catch(err => { syncKey.current = ''; setError(err.message); });
  }, [bound, evidence.applied, evidence.evidenceId, evidence.taskId, progress?.launchId, save, stage, task?.taskId]);
  useEffect(() => {
    if (!bound || !task?.taskId || task.chatId !== chat.currentChatId || progress.taskId === task.taskId) return;
    void save({ taskId: task.taskId }).catch(err => setError(err.message));
  }, [bound, task?.taskId, task?.chatId, chat.currentChatId, progress?.taskId, save]);
  useEffect(() => {
    if (!bound || stage !== 'plan' || plan?.stage !== 'plan_approved' || evidence.applied) return;
    void save({ stage: 'build' }).catch(err => setError(err.message));
  }, [bound, stage, plan?.stage, evidence.applied, save]);
  if (!bound) return null;

  return <details className="guided-launch-checklist" open>
    <summary>{stage === 'complete' ? 'Your first creation · you did it' : 'Your first creation'}</summary>
    <ol aria-label="First creation progress">{['Plan', 'Build', 'Try it'].map((label, i) => <li key={label} aria-current={(stage === 'plan' ? 0 : stage === 'build' ? 1 : 2) === i ? 'step' : undefined}>{label}</li>)}</ol>
    {error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => operation(async () => { await launch.refresh(); setError(''); })}>Reload progress</Button></div>}
    {stage === 'complete' ? <>
      <p>What would you like to change next? Keep building in this conversation.</p>
      <Button variant="ghost" onClick={() => operation(() => save({ dismissed: true }))} disabled={disabled}>Done</Button>
    </> : <>
      {!ready && <p role="status">Studio needs to reconnect before you can build or try this creation. <button type="button" onClick={onOpenSetup}>Open setup</button></p>}
      {stage === 'plan' && <>
        <p>{plan ? 'Review the first milestone below. Tell Nexus what you want changed, or choose Build this first on the plan.' : hasRequest ? 'Nexus will propose one playable part of your idea. Discuss it in the conversation before you build.' : 'Start with one playable part. Nexus will suggest a small milestone and explain how to test it. You can edit the plan before building.'}</p>
        {!hasRequest && <Button disabled={disabled || chat.activeMode !== 'plan'} onClick={() => operation(async () => {
          await onSubmit(null, firstMilestonePrompt(progress.idea), { operationId: `launch-plan-${progress.launchId}`, attachmentsOverride: [] });
        })}>Plan my first milestone</Button>}
      </>}
      {stage === 'build' && <p>Follow the build in the conversation. This step completes when Studio confirms the changes were applied. Any limits or approval requests appear with the build.</p>}
      {(stage === 'try' || evidence.applied) && <>
        {!samePlace && <p role="status">The connected place has changed since this build. Reconnect the place used for the build before confirming the playtest.</p>}
        <p>Open <strong>{studio.activePlaceName || 'your connected place'}</strong> in Studio and press <strong>Play</strong>. Try the milestone from your accepted plan.</p>
        {tests ? <p style={{ whiteSpace: 'pre-wrap' }}>{tests}</p> : <p>Follow the playtest steps in the plan and compare what happens with its expected result.</p>}
        <p>This is your manual playtest. Stop Play before asking Nexus to make another change.</p>
        <div className="guided-launch-checklist-actions">
          <Button disabled={disabled || !ready || !samePlace || !evidence.applied} onClick={() => operation(async () => {
            await save({ stage: 'complete' });
            void trackProductEvent('onboarding_confirmed_success', { stage: 'complete', verification: 'user_confirmed' });
          })}>It works</Button>
          <Button variant="outline" disabled={disabled} onClick={() => operation(async () => {
            await save({ stage: 'build', ignoredEvidenceId: evidence.evidenceId || '' });
            setPrompt('I tried the first milestone in Studio. Here is what happened instead of the expected result: ');
            await chat.updateChatMode(chat.currentChatId, 'debug');
          })}>Something needs fixing</Button>
        </div>
      </>}
      <Button variant="ghost" disabled={disabled} onClick={() => operation(async () => { await save({ dismissed: true }); void trackProductEvent('onboarding_paused', { stage }); })}>Pause guide</Button>
    </>}
  </details>;
}
