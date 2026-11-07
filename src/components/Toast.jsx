export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="toast no-print" role="status">
      <span>{toast.message}</span>
      {toast.action && (
        <button type="button" className="toast__action" onClick={() => { toast.action.run(); onClose(); }}>
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
