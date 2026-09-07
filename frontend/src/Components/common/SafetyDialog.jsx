import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './SafetyDialog.css';

export default function SafetyDialog({ title, description, confirmLabel, report = false, children, onConfirm, onClose }) {
  const ref = useRef(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  const submit = async event => {
    event.preventDefault();
    if (busy || (report && !reason.trim())) return;
    setBusy(true); setError('');
    try { await onConfirm(reason.trim()); onClose(); }
    catch (err) { setError(err.response?.data?.message || err.message || 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };
  return createPortal(<dialog className="safety-dialog" ref={ref} aria-labelledby="safety-title" aria-describedby="safety-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === ref.current && !busy) { const r = ref.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); } }}>
    <form onSubmit={submit}>
      <h2 id="safety-title">{title}</h2>
      <p id="safety-description">{description}</p>
      {report && <><label htmlFor="report-reason">Reason (required)</label><textarea autoFocus id="report-reason" required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} rows={5} /></>}
      {children}
      {error && <p role="alert">{error}</p>}
      <div className="safety-dialog-actions"><button type="button" autoFocus={!report} disabled={busy} onClick={onClose}>Cancel</button><button className="safety-danger" type="submit" disabled={busy || (report && !reason.trim())}>{busy ? 'Please wait…' : confirmLabel}</button></div>
    </form>
  </dialog>, document.body);
}
