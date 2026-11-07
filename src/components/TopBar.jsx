import { ArrowLeft, Undo2, Redo2, CircleHelp, Printer, Check, LoaderCircle, CloudOff, Pencil } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';

const STATUS = {
  saved: { icon: Check, text: 'All saved', tone: 'ok' },
  unsaved: { icon: LoaderCircle, text: 'Saving soon…', tone: 'busy' },
  saving: { icon: LoaderCircle, text: 'Saving…', tone: 'busy' },
  error: { icon: CloudOff, text: 'Not saved yet', tone: 'error', hint: 'We couldn’t reach the internet. Your work is kept on this computer and we’ll keep trying.' },
};

export function SaveStatus({ status }) {
  const s = STATUS[status] || STATUS.saved;
  const Icon = s.icon;
  return (
    <span className={`save-status save-status--${s.tone}`} role="status" title={s.hint}>
      <Icon size={16} className={s.tone === 'busy' ? 'spin' : undefined} aria-hidden="true" />
      {s.text}
    </span>
  );
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const KEY = isMac ? '⌘' : 'Ctrl+';

export function TopBar({ name, onRename, onBack, saveStatus, canUndo, canRedo, onUndo, onRedo, onHelp, onPrint }) {
  return (
    <header className="topbar">
      <button type="button" className="btn btn--ghost topbar__back" onClick={onBack}>
        <ArrowLeft size={20} aria-hidden="true" /> <span className="hide-sm">My projects</span>
      </button>

      <div className="topbar__name">
        <label htmlFor="project-name" className="visually-hidden">Project name</label>
        <input id="project-name" className="name-input" value={name} onChange={(e) => onRename(e.target.value)} placeholder="Name your project" />
        <Pencil size={16} className="name-input__icon" aria-hidden="true" />
      </div>

      <SaveStatus status={saveStatus} />

      <div className="topbar__tools">
        <div className="btn-pair" data-tour="undo">
          <button type="button" className="btn btn--ghost" onClick={onUndo} disabled={!canUndo} title={`Undo (${KEY}Z)`}>
            <Undo2 size={20} aria-hidden="true" /> <span className="hide-md">Undo</span>
          </button>
          <button type="button" className="btn btn--ghost" onClick={onRedo} disabled={!canRedo} title={`Redo (${KEY}Shift+Z)`}>
            <Redo2 size={20} aria-hidden="true" /> <span className="hide-md">Redo</span>
          </button>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onHelp} data-tour="help">
          <CircleHelp size={20} aria-hidden="true" /> <span className="hide-md">Show me how</span>
        </button>
        <button type="button" className="btn btn--primary" onClick={onPrint} data-tour="print">
          <Printer size={20} aria-hidden="true" /> Print
        </button>
        <span className="topbar__user"><UserButton /></span>
      </div>
    </header>
  );
}
