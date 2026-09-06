import { useCallback, useEffect, useRef, useState } from 'react';
import { getGuidedLaunch, updateGuidedLaunch } from '../../lib/guidedLaunchApi';
import { trackProductEvent } from '../../lib/productAnalytics';

export function useGuidedLaunch(uid) {
  const [state, setState] = useState({ uid, progress: null, loading: Boolean(uid), error: '' });
  const current = useRef(null);
  const owner = useRef(uid);
  const queue = useRef(Promise.resolve());
  owner.current = uid;
  const accept = useCallback((progress) => {
    if (current.current && (!progress || progress.revision < current.current.revision)) return current.current;
    current.current = progress;
    setState({ uid, progress, loading: false, error: '' });
    return progress;
  }, [uid]);
  const refresh = useCallback(async () => {
    try {
      const progress = await getGuidedLaunch();
      if (owner.current === uid) accept(progress);
      return progress;
    } catch (error) {
      if (owner.current === uid) setState(s => ({ ...s, uid, loading: false, error: error.message }));
      return null;
    }
  }, [uid, accept]);
  useEffect(() => {
    current.current = null;
    if (!uid) { setState({ uid, progress: null, loading: false, error: '' }); return; }
    setState({ uid, progress: null, loading: true, error: '' });
    void refresh();
  }, [uid, refresh]);
  const save = useCallback((patch) => {
    const next = queue.current.catch(() => {}).then(async () => {
      if (owner.current !== uid) throw new Error('Your account changed. Reload to continue.');
      const progress = await updateGuidedLaunch({ ...patch, revision: current.current?.revision });
      if (owner.current === uid) accept(progress);
      return progress;
    });
    queue.current = next;
    return next;
  }, [uid, accept]);
  const progress = state.uid === uid ? state.progress : null;
  const stage = progress?.stage;
  const dismissed = progress?.dismissed;
  useEffect(() => {
    if (stage && !dismissed) void trackProductEvent('onboarding_stage_entered', { stage, surface: 'guided_launch' });
  }, [stage, dismissed]);
  return { progress, loading: state.uid !== uid || state.loading, error: state.uid === uid ? state.error : '', save, refresh, accept };
}
