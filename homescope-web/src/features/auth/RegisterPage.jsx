import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { registro } from './authService';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { rol: 'comprador' } });

  async function onSubmit(data) {
    setServerError('');
    try {
      await registro(data);
      setSuccess(true);
    } catch (err) {
      setServerError(err?.message ?? 'Error al registrar. Intenta de nuevo.');
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">¡Registro exitoso!</h2>
          <p className="text-gray-600">
            Revisa tu correo electrónico y haz clic en el enlace de verificación para activar tu
            cuenta.
          </p>
          <Link to="/login" className="inline-block text-blue-600 hover:underline font-medium">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Crear cuenta</h1>
          <p className="text-sm text-gray-500 mt-1">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>

        {serverError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {serverError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.nombre ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="María López"
              {...register('nombre', {
                required: 'El nombre es obligatorio.',
                minLength: { value: 2, message: 'Mínimo 2 caracteres.' },
                maxLength: { value: 100, message: 'Máximo 100 caracteres.' },
              })}
            />
            {errors.nombre && (
              <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña <span className="text-red-500">*</span>
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

          {/* Teléfono (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="tel"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.telefono ? 'border-red-400' : 'border-gray-300'
              }`}
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
            {errors.telefono && (
              <p className="text-xs text-red-500 mt-1">{errors.telefono.message}</p>
            )}
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Cómo usarás HomeScope? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'comprador', label: '🏠 Comprador / Arrendatario', desc: 'Busco propiedades' },
                { value: 'vendedor', label: '🏷️ Vendedor / Arrendador', desc: 'Publico propiedades' },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  className="relative flex flex-col items-center border rounded-xl p-3 cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <input
                    type="radio"
                    value={value}
                    className="sr-only"
                    {...register('rol')}
                  />
                  <span className="text-sm font-medium text-gray-800 text-center">{label}</span>
                  <span className="text-xs text-gray-500 mt-0.5">{desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {isSubmitting ? 'Registrando…' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
