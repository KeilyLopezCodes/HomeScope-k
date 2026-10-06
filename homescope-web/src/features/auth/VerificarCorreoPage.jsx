import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';

export default function VerificarCorreoPage() {
  const [searchParams] = useSearchParams();
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'ok' | 'error'
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setEstado('error');
      setMensaje('El enlace no contiene un token válido.');
      return;
    }

    apiClient(`/api/v1/auth/verificar-correo?token=${token}`)
      .then(() => setEstado('ok'))
      .catch((err) => {
        setEstado('error');
        setMensaje(err?.message ?? 'El enlace no es válido o ya fue utilizado.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center space-y-4">
        {estado === 'cargando' && (
          <p className="text-sm text-gray-400">Verificando tu correo…</p>
        )}

        {estado === 'ok' && (
          <>
            <div className="text-4xl">✅</div>
            <h1 className="text-xl font-bold text-gray-800">¡Correo verificado!</h1>
            <p className="text-sm text-gray-500">Tu cuenta está activa. Ya puedes iniciar sesión.</p>
            <Link
              to="/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Iniciar sesión
            </Link>
          </>
        )}

        {estado === 'error' && (
          <>
            <div className="text-4xl">❌</div>
            <h1 className="text-xl font-bold text-gray-800">Enlace inválido</h1>
            <p className="text-sm text-gray-500">{mensaje}</p>
            <Link
              to="/registro"
              className="inline-block text-blue-600 hover:underline text-sm"
            >
              Volver al registro
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
