import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle size={16} className="text-success-600 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-warning-600 shrink-0" />,
  error:   <XCircle size={16} className="text-danger-600 shrink-0" />,
  info:    <Info size={16} className="text-primary-600 shrink-0" />,
};

const STYLES = {
  success: 'border-success-200 bg-success-50',
  warning: 'border-warning-200 bg-warning-50',
  error:   'border-danger-200 bg-danger-50',
  info:    'border-primary-200 bg-primary-50',
};

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
          {toasts.map(({ id, message, type }) => (
            <div
              key={id}
              role="alert"
              className={[
                'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-md text-sm text-secondary-800',
                STYLES[type] ?? STYLES.info,
              ].join(' ')}
            >
              {ICONS[type]}
              <span className="flex-1">{message}</span>
              <button
                onClick={() => dismiss(id)}
                aria-label="Cerrar"
                className="text-secondary-400 hover:text-secondary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
