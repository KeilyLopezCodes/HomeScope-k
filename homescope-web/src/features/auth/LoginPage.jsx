import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from './authService';
import { useAuth } from './authContext';
import AuthLayout, { estiloCampo, estiloEtiqueta, estiloError } from './components/AuthLayout';

const ROLE_REDIRECT = {
  admin: '/admin',
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
      const from = location.state?.from ?? (res.usuario?.rol === 'admin' ? '/admin' : '/propiedades');
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err?.message ?? 'Credenciales incorrectas. Intenta de nuevo.');
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-secondary-500">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="font-medium text-primary-600 hover:underline">
              Regístrate
            </Link>
          </p>
        </div>

        {serverError && (
          <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700">
            {serverError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="login-email" className={estiloEtiqueta}>
              Correo electrónico
            </label>
            <input
              id="login-email"
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

          {/* Contraseña */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="login-password" className="block text-sm font-medium text-secondary-700">Contraseña</label>
              <Link to="/recuperar" className="text-xs font-medium text-primary-600 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              className={estiloCampo(errors.password)}
              placeholder="Tu contraseña"
              {...register('password', { required: 'La contraseña es obligatoria.' })}
            />
            {errors.password && <p className={estiloError}>{errors.password.message}</p>}
          </div>

          {/* Recordar sesión */}
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
              {...register('recordar')}
            />
            <span className="text-sm text-secondary-600">Recordar sesión</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-sm text-secondary-500">
          <Link to="/propiedades" className="font-medium text-primary-600 hover:underline">Explorar propiedades sin iniciar sesión</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
