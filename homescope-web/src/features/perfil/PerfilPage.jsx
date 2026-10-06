import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../auth/authContext';
import {
  getPerfil,
  updatePerfil,
  getPropiedadesPublicadas,
  getPropiedadesGuardadas,
  getPropiedadesVistas,
} from './perfilService';

const ROL_LABEL = { comprador: 'Comprador', vendedor: 'Vendedor', admin: 'Administrador' };

function PropiedadCard({ item }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 text-sm">
      <p className="font-medium text-gray-800 truncate">{item.titulo ?? item.direccion ?? `Propiedad #${item.id}`}</p>
      {item.precio && (
        <p className="text-gray-500 mt-1">Q {Number(item.precio).toLocaleString()}</p>
      )}
    </div>
  );
}

function HistorialSection({ titulo, items, vacio }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-700 mb-3">{titulo}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{vacio}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <PropiedadCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function PerfilPage() {
  const { user, updateUser } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [historial, setHistorial] = useState({ publicadas: [], guardadas: [], vistas: [] });
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [editando, setEditando] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    getPerfil()
      .then((data) => {
        setPerfil(data);
        reset({ nombre: data.nombre, telefono: data.telefono ?? '' });
      })
      .finally(() => setLoadingPerfil(false));
  }, [reset]);

  useEffect(() => {
    if (!perfil) return;
    const rol = perfil.rol ?? '';
    const esVendedor = rol.includes('vendedor') || rol === 'admin';
    const esComprador = rol.includes('comprador') || rol === 'admin';

    if (esVendedor) getPropiedadesPublicadas().then((d) => setHistorial((h) => ({ ...h, publicadas: d })));
    if (esComprador) {
      getPropiedadesGuardadas().then((d) => setHistorial((h) => ({ ...h, guardadas: d })));
      getPropiedadesVistas().then((d) => setHistorial((h) => ({ ...h, vistas: d })));
    }
  }, [perfil]);

  async function onSubmit(data) {
    setServerError('');
    setSuccessMsg('');
    try {
      const actualizado = await updatePerfil({
        nombre: data.nombre,
        telefono: data.telefono || undefined,
      });
      setPerfil(actualizado);
      updateUser({ nombre: actualizado.nombre });
      reset({ nombre: actualizado.nombre, telefono: actualizado.telefono ?? '' });
      setEditando(false);
      setSuccessMsg('Perfil actualizado correctamente.');
    } catch (err) {
      setServerError(err?.message ?? 'No se pudo actualizar el perfil.');
    }
  }

  if (loadingPerfil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Cargando perfil…</p>
      </div>
    );
  }

  const rol = perfil?.rol ?? '';
  const esVendedor = rol.includes('vendedor') || rol === 'admin';
  const esComprador = rol.includes('comprador') || rol === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* ── Datos básicos ── */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Mi perfil</h1>
              <span className="inline-block mt-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5">
                {ROL_LABEL[rol] ?? rol}
              </span>
            </div>
            {!editando && (
              <button
                onClick={() => { setEditando(true); setSuccessMsg(''); }}
                className="text-sm text-blue-600 hover:underline"
              >
                Editar
              </button>
            )}
          </div>

          {successMsg && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              {successMsg}
            </p>
          )}
          {serverError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {serverError}
            </p>
          )}

          {editando ? (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.nombre ? 'border-red-400' : 'border-gray-300'
                  }`}
                  {...register('nombre', {
                    required: 'El nombre es obligatorio.',
                    minLength: { value: 2, message: 'Mínimo 2 caracteres.' },
                    maxLength: { value: 100, message: 'Máximo 100 caracteres.' },
                  })}
                />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.telefono ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="+502 5555-1234"
                  {...register('telefono', {
                    maxLength: { value: 20, message: 'Máximo 20 caracteres.' },
                  })}
                />
                {errors.telefono && <p className="text-xs text-red-500 mt-1">{errors.telefono.message}</p>}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditando(false); setServerError(''); reset({ nombre: perfil.nombre, telefono: perfil.telefono ?? '' }); }}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <dl className="space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className="w-28 text-gray-500 shrink-0">Nombre</dt>
                <dd className="text-gray-800 font-medium">{perfil.nombre}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-gray-500 shrink-0">Correo</dt>
                <dd className="text-gray-800">{perfil.email}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-gray-500 shrink-0">Teléfono</dt>
                <dd className="text-gray-800">{perfil.telefono ?? <span className="text-gray-400">No registrado</span>}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-gray-500 shrink-0">Miembro desde</dt>
                <dd className="text-gray-800">
                  {new Date(perfil.creado_en).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' })}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {/* ── Historial de actividad ── */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-800">Historial de actividad</h2>

          {esVendedor && (
            <HistorialSection
              titulo="Propiedades publicadas"
              items={historial.publicadas}
              vacio="Aún no has publicado propiedades."
            />
          )}

          {esComprador && (
            <>
              <HistorialSection
                titulo="Propiedades guardadas"
                items={historial.guardadas}
                vacio="No tienes propiedades guardadas."
              />
              <HistorialSection
                titulo="Propiedades vistas recientemente"
                items={historial.vistas}
                vacio="No has visto propiedades recientemente."
              />
            </>
          )}
        </div>

      </div>
    </div>
  );
}
