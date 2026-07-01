import { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import './Toast.css';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
      <span>{message}</span>
    </div>
  );
}
