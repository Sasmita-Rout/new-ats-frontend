import React from 'react';
import { toast } from 'react-toastify';

type ToastConfirmProps = {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

export const ToastConfirm: React.FC<ToastConfirmProps> = ({ message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm }) => {
  const handleConfirm = () => {
    try {
      onConfirm();
    } finally {
      toast.dismiss();
    }
  };

  const handleCancel = () => {
    toast.dismiss();
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <div style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }}>{message}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={handleCancel} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff' }}>
          {cancelLabel}
        </button>
        <button onClick={handleConfirm} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#0b69ff', color: '#fff' }}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
};

export default ToastConfirm;
