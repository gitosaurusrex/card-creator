import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * A modal built on the native <dialog> element, which handles focus
 * trapping, Escape and the backdrop for us.
 */
export function Dialog({ open, onClose, title, children, footer, className = '', labelledBy }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog no-print ${className}`}
      aria-labelledby={labelledBy || 'dialog-title'}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && (
        <div className="dialog__body">
          {title && (
            <header className="dialog__head">
              <h2 id={labelledBy || 'dialog-title'} className="dialog__title">{title}</h2>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
                <X size={20} aria-hidden="true" />
              </button>
            </header>
          )}
          {children}
          {footer && <footer className="dialog__foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, danger = false }) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      className="dialog--small"
      footer={(
        <>
          <button type="button" className="btn btn--soft" onClick={onCancel}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </>
      )}
    >
      <p className="dialog__text">{message}</p>
    </Dialog>
  );
}
