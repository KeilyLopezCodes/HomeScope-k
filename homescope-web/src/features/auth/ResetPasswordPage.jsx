import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h2 className="text-2xl font-bold text-gray-800">Contraseña actualizada</h2>
          <p className="text-gray-600">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nueva contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">Elige una contraseña segura de al menos 8 caracteres.</p>
        </div>

        {serverError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 space-y-1">
            <p>{serverError}</p>
            <Link to="/recuperar" className="underline font-medium">
              Solicitar un nuevo enlace
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="Mínimo 8 caracteres"
              {...register('password', {
                required: 'La contraseña es obligatoria.',
                minLength: { value: 8, message: 'Mínimo 8 caracteres.' },
                maxLength: { value: 72, message: 'Máximo 72 caracteres.' },
              })}
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.confirmar ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="Repite la contraseña"
              {...register('confirmar', {
                required: 'Confirma tu contraseña.',
                validate: (v) => v === watch('password') || 'Las contraseñas no coinciden.',
              })}
            />
            {errors.confirmar && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmar.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
