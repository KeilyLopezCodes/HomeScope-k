import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from './authService';
import { useAuth } from './authContext';

const ROLE_REDIRECT = {
  admin: '/admin',
  vendedor: '/propiedades/nueva',
  comprador: '/propiedades',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { recordar: false } });

  async function onSubmit(data) {
    setServerError('');
    try {
      const res = await login(data);
      signIn(res.accessToken, res.usuario);
      const from = location.state?.from ?? ROLE_REDIRECT[res.usuario?.rol] ?? '/propiedades';
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err?.message ?? 'Credenciales incorrectas. Intenta de nuevo.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Iniciar sesión</h1>
          <p className="text-sm text-gray-500 mt-1">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-blue-600 hover:underline">
              Regístrate
            </Link>
          </p>
        </div>

        {serverError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {serverError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="maria@example.com"
              {...register('email', {
                required: 'El correo es obligatorio.',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Ingresa un correo válido.',
                },
              })}
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <Link to="/recuperar" className="text-xs text-blue-600 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              type="password"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="Tu contraseña"
              {...register('password', { required: 'La contraseña es obligatoria.' })}
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Recordar sesión */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              {...register('recordar')}
            />
            <span className="text-sm text-gray-600">Recordar sesión</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
