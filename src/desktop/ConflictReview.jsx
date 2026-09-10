import React, { useEffect, useState } from 'react';
const kinds = ['conversation','message','plan','artifact','project','settings'];
export default function ConflictReview({ api, onClose }) {
  const [kind, setKind] = useState('conversation');
  const [page, setPage] = useState(null), [cursor, setCursor] = useState(undefined), [revision, setRevision] = useState(0);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setPage(null);
    setError('');
    api.list({ kind, cursor, conflictsOnly: true, limit: 20 }).then(async value => {
      const originals = await Promise.all(value.entities.map(entity => api.getEntity(entity.data.conflictOf)));
      if (active) setPage({ ...value, originals: Object.fromEntries(originals.filter(Boolean).map(entity => [entity.id, entity])) });
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [api, kind, cursor, revision]);
  async function resolve(id, choice) {
    setBusy(true); setError('');
    try { await api.resolveConflict(id, choice); setRevision(value => value + 1); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="desktop-conflicts" aria-label="Review conflicting edits"><header><h2>Conflicting edits</h2><button onClick={onClose}>Close</button></header>
    <p>Automatic sync kept both versions. Review your recovered edit before choosing which records to retain.</p>
    <label>Record type <select value={kind} onChange={event => { setKind(event.target.value); setCursor(undefined); }}>
      {kinds.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    {error && <p role="alert">{error}</p>}
    {!page ? <p role="status">Loading conflicting edits…</p> : !page.entities.length ? <p>No unresolved conflicts in this category.</p> : page.entities.map(entity => <article key={entity.id}>
      <h3>{entity.data.title || entity.data.name || 'Recovered edit'}</h3>
      <div className="desktop-conflict-comparison"><div><h4>Current version</h4><pre>{describe(page.originals[entity.data.conflictOf])}</pre></div><div><h4>Recovered edit</h4><pre>{describe(entity)}</pre></div></div>
      {['conversation', 'project'].includes(entity.kind) && <p>These versions describe the same {entity.kind}. Keeping both retains both sets of details; existing messages and files stay with the original record.</p>}
      <button disabled={busy} onClick={() => void resolve(entity.id, 'keep_both')}>Keep both records</button><button disabled={busy} onClick={() => void resolve(entity.id, 'use_copy')}>Use recovered edit</button><button disabled={busy} onClick={() => void resolve(entity.id, 'use_current')}>Keep current version</button>
    </article>)}
    {page?.nextCursor && <button onClick={() => setCursor(page.nextCursor)}>Next page</button>}
  </section>;
}
function describe(entity) {
  if (!entity) return 'The current record is unavailable.';
  if (entity.deleted) return 'This record was deleted on another device. Using the recovered edit restores it.';
  return String(entity.data.content || entity.data.code || JSON.stringify(entity.data, null, 2));
}
