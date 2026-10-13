import { forwardRef } from 'react';

// Estilos base compartidos para campos
const fieldBase =
  'w-full rounded border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 ' +
  'placeholder:text-secondary-400 transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ' +
  'disabled:bg-secondary-100 disabled:cursor-not-allowed';

const errorField = 'border-danger-500 focus:ring-danger-500 focus:border-danger-500';

function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-secondary-700 mb-1">
      {children}
      {required && <span className="text-danger-500 ml-0.5">*</span>}
    </label>
  );
}

function ErrorMsg({ id, message }) {
  if (!message) return null;
  return <p id={id} className="mt-1 text-xs text-danger-600">{message}</p>;
}

// Los campos usan forwardRef: React Hook Form necesita el ref del elemento nativo para leer su valor
export const Input = forwardRef(function Input({ id, label, error, required, className = '', ...props }, ref) {
  const errId = error ? `${id}-error` : undefined;
  return (
    <div className={className}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <input
        ref={ref}
        id={id}
        aria-describedby={errId}
        aria-invalid={!!error}
        className={[fieldBase, error ? errorField : ''].join(' ')}
        {...props}
      />
      <ErrorMsg id={errId} message={error} />
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ id, label, error, required, className = '', ...props }, ref) {
  const errId = error ? `${id}-error` : undefined;
  return (
    <div className={className}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <textarea
        ref={ref}
        id={id}
        aria-describedby={errId}
        aria-invalid={!!error}
        rows={4}
        className={[fieldBase, 'resize-y', error ? errorField : ''].join(' ')}
        {...props}
      />
      <ErrorMsg id={errId} message={error} />
    </div>
  );
});

export const Select = forwardRef(function Select({ id, label, error, required, children, className = '', ...props }, ref) {
  const errId = error ? `${id}-error` : undefined;
  return (
    <div className={className}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <select
        ref={ref}
        id={id}
        aria-describedby={errId}
        aria-invalid={!!error}
        className={[fieldBase, error ? errorField : ''].join(' ')}
        {...props}
      >
        {children}
      </select>
      <ErrorMsg id={errId} message={error} />
    </div>
  );
});

export const Checkbox = forwardRef(function Checkbox({ id, label, error, className = '', ...props }, ref) {
  const errId = error ? `${id}-error` : undefined;
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="checkbox"
          id={id}
          aria-describedby={errId}
          aria-invalid={!!error}
          className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
          {...props}
        />
        {label && (
          <label htmlFor={id} className="text-sm text-secondary-700 cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
      <ErrorMsg id={errId} message={error} />
    </div>
  );
});
