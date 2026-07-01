import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color="var(--neon-pink)" />
            <h2 style={{ margin: 0 }}>{title}</h2>
          </div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body" style={{ gap: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{message}</p>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
            <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
