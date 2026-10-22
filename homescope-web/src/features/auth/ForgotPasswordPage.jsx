import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import AuthLayout, { estiloCampo, estiloEtiqueta, estiloError } from './components/AuthLayout';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit({ email }) {
    setServerError('');
    try {
      await apiClient('/api/v1/auth/recuperar', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setServerError(err?.message ?? 'Error al enviar. Intenta de nuevo.');
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <MailCheck size={48} className="mx-auto text-primary-600" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-secondary-900">Revisa tu correo</h2>
          <p className="text-secondary-600">
            Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.
            El enlace expira en <strong>1 hora</strong>.
          </p>
          <Link to="/login" className="inline-block font-medium text-primary-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {serverError && (
          <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700">
            {serverError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div>
            <label htmlFor="recuperar-email" className={estiloEtiqueta}>
              Correo electrónico
            </label>
            <input
              id="recuperar-email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              className={estiloCampo(errors.email)}
              placeholder="maria@example.com"
              {...register('email', {
                required: 'El correo es obligatorio.',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Ingresa un correo válido.',
                },
              })}
            />
            {errors.email && <p className={estiloError}>{errors.email.message}</p>}
          </div>

          <div className="flex gap-3">
            <Link
              to="/login"
              className="flex-1 rounded-lg border border-secondary-300 py-3 text-center text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
