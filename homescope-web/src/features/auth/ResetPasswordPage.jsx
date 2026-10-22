import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import AuthLayout, { estiloCampo, estiloEtiqueta, estiloError } from './components/AuthLayout';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm();

  async function onSubmit({ password }) {
    setServerError('');
    try {
      await apiClient(`/api/v1/auth/recuperar/${token}`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
    } catch (err) {
      setServerError(err?.message ?? 'Error al restablecer. El enlace puede haber expirado.');
    }
  }

  if (isSubmitSuccessful && !serverError) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <CheckCircle2 size={48} className="mx-auto text-success-600" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-secondary-900">Contraseña actualizada</h2>
          <p className="text-secondary-600">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="inline-block rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-secondary-500">Elige una contraseña segura de al menos 8 caracteres.</p>
        </div>

        {serverError && (
          <div role="alert" className="space-y-1 rounded-lg border border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700">
            <p>{serverError}</p>
            <Link to="/recuperar" className="font-medium underline">
              Solicitar un nuevo enlace
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div>
            <label htmlFor="nueva-password" className={estiloEtiqueta}>
              Nueva contraseña
            </label>
            <input
              id="nueva-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              className={estiloCampo(errors.password)}
              placeholder="Mínimo 8 caracteres"
              {...register('password', {
                required: 'La contraseña es obligatoria.',
                minLength: { value: 8, message: 'Mínimo 8 caracteres.' },
                maxLength: { value: 72, message: 'Máximo 72 caracteres.' },
              })}
            />
            {errors.password && <p className={estiloError}>{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmar-password" className={estiloEtiqueta}>
              Confirmar contraseña
            </label>
            <input
              id="confirmar-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmar)}
              className={estiloCampo(errors.confirmar)}
              placeholder="Repite la contraseña"
              {...register('confirmar', {
                required: 'Confirma tu contraseña.',
                validate: (v) => v === watch('password') || 'Las contraseñas no coinciden.',
              })}
            />
            {errors.confirmar && <p className={estiloError}>{errors.confirmar.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
