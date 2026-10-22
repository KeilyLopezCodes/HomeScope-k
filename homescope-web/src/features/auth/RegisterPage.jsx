import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { registro } from './authService';
import AuthLayout, { estiloCampo, estiloEtiqueta, estiloError } from './components/AuthLayout';

const Obligatorio = () => <span className="text-danger-500">*</span>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { roles: ['comprador'] } });

  async function onSubmit(data) {
    setServerError('');
    try {
      // roles viene como string del radio; convertir a array
      await registro({ ...data, roles: [data.roles] });
      setSuccess(true);
    } catch (err) {
      setServerError(err?.message ?? 'Error al registrar. Intenta de nuevo.');
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <MailCheck size={48} className="mx-auto text-success-600" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-secondary-900">¡Registro exitoso!</h2>
          <p className="text-secondary-600">
            Revisa tu correo electrónico y haz clic en el enlace de verificación para activar tu
            cuenta.
          </p>
          <Link to="/login" className="inline-block font-medium text-primary-600 hover:underline">
            Ir al inicio de sesión
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Crear cuenta</h1>
          <p className="mt-1 text-sm text-secondary-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>

        {serverError && (
          <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700">
            {serverError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Nombre + Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="registro-nombre" className={estiloEtiqueta}>
                Nombre <Obligatorio />
              </label>
              <input
                id="registro-nombre"
                type="text"
                autoComplete="given-name"
                aria-invalid={Boolean(errors.nombre)}
                className={estiloCampo(errors.nombre)}
                placeholder="María"
                {...register('nombre', {
                  required: 'Obligatorio.',
                  minLength: { value: 2, message: 'Mínimo 2 caracteres.' },
                  maxLength: { value: 100, message: 'Máximo 100 caracteres.' },
                })}
              />
              {errors.nombre && <p className={estiloError}>{errors.nombre.message}</p>}
            </div>
            <div>
              <label htmlFor="registro-apellido" className={estiloEtiqueta}>
                Apellido <Obligatorio />
              </label>
              <input
                id="registro-apellido"
                type="text"
                autoComplete="family-name"
                aria-invalid={Boolean(errors.apellido)}
                className={estiloCampo(errors.apellido)}
                placeholder="López"
                {...register('apellido', {
                  required: 'Obligatorio.',
                  minLength: { value: 2, message: 'Mínimo 2 caracteres.' },
                  maxLength: { value: 100, message: 'Máximo 100 caracteres.' },
                })}
              />
              {errors.apellido && <p className={estiloError}>{errors.apellido.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="registro-email" className={estiloEtiqueta}>
              Correo electrónico <Obligatorio />
            </label>
            <input
              id="registro-email"
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
            <label htmlFor="registro-password" className={estiloEtiqueta}>
              Contraseña <Obligatorio />
            </label>
            <input
              id="registro-password"
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

          {/* Teléfono (opcional) */}
          <div>
            <label htmlFor="registro-telefono" className={estiloEtiqueta}>
              Teléfono <span className="font-normal text-secondary-400">(opcional)</span>
            </label>
            <input
              id="registro-telefono"
              type="tel"
              autoComplete="tel"
              aria-invalid={Boolean(errors.telefono)}
              className={estiloCampo(errors.telefono)}
              placeholder="+502 5555-1234"
              onKeyDown={(e) => {
                // Permitir: dígitos, +, -, espacio, y teclas de control
                const allowed = /[\d+\-\s]/;
                if (!allowed.test(e.key) && e.key.length === 1) e.preventDefault();
              }}
              {...register('telefono', {
                maxLength: { value: 20, message: 'Máximo 20 caracteres.' },
                pattern: {
                  value: /^[\d+\-\s]+$/,
                  message: 'Solo se permiten números, +, - y espacios.',
                },
              })}
            />
            {errors.telefono && <p className={estiloError}>{errors.telefono.message}</p>}
          </div>

          {/* Rol */}
          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-secondary-700">
              ¿Cómo usarás HomeScope? <Obligatorio />
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'comprador', label: '🏠 Comprador / Arrendatario', desc: 'Busco propiedades' },
                { value: 'vendedor', label: '🏷️ Vendedor / Arrendador', desc: 'Publico propiedades' },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  className="relative flex cursor-pointer flex-col items-center rounded-xl border border-secondary-200 p-3 transition-colors hover:border-secondary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500"
                >
                  <input
                    type="radio"
                    value={value}
                    className="sr-only"
                    {...register('roles')}
                  />
                  <span className="text-center text-sm font-medium text-secondary-800">{label}</span>
                  <span className="mt-0.5 text-xs text-secondary-500">{desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex-1 rounded-lg border border-secondary-300 py-3 text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {isSubmitting ? 'Registrando…' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
