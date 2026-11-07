// The live region stays in the page so screen readers announce new messages.
export function Toast({ toast, onClose }) {
  return (
    <div className="toast-region no-print" role="status">
      {toast && (
        <div className="toast">
          <span>{toast.message}</span>
          {toast.action && (
            <button type="button" className="toast__action" onClick={() => { toast.action.run(); onClose(); }}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
