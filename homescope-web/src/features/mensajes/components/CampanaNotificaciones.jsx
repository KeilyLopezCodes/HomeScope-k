import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useMarcarNotificacion, useNotificaciones } from '../hooks/useMensajeria';
import { haceCuanto } from '../utils/tiempo';
import { rutaDeNotificacion as rutaDe } from '../utils/notificaciones';

// Campana del navbar: contador de no leídas y las notificaciones más recientes.
// Se actualiza sola con Socket.io (AvisosTiempoReal invalida la consulta al llegar una nueva).
export default function CampanaNotificaciones() {
  const { data } = useNotificaciones();
  const marcar = useMarcarNotificacion();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => { if (!contenedor.current?.contains(e.target)) setAbierto(false); };
    const tecla = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const noLeidas = data?.no_leidas ?? 0;
  const notificaciones = data?.data ?? [];

  function abrir(n) {
    setAbierto(false);
    if (!n.leida) marcar.mutate({ id: n.id });
    const ruta = rutaDe(n);
    if (ruta) navigate(ruta);
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={noLeidas ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones'}
        className="relative rounded-md p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <Bell size={18} aria-hidden="true" />
        {noLeidas > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-50 mt-1 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-gray-800">Notificaciones</p>
            {noLeidas > 0 && <span className="text-xs text-gray-500">{noLeidas} sin leer</span>}
          </div>

          {notificaciones.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No tienes notificaciones.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
              {notificaciones.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => abrir(n)}
                    className={['flex w-full gap-2.5 px-4 py-3 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none', n.leida ? '' : 'bg-primary-50/50'].join(' ')}
                  >
                    <span
                      aria-hidden="true"
                      className={['mt-1.5 h-2 w-2 shrink-0 rounded-full', n.leida ? 'bg-transparent' : 'bg-primary-600'].join(' ')}
                    />
                    <span className="min-w-0">
                      <span className={['block truncate text-sm', n.leida ? 'text-gray-700' : 'font-semibold text-gray-900'].join(' ')}>
                        {n.titulo}
                      </span>
                      <span className="line-clamp-2 block text-xs text-gray-500">{n.contenido}</span>
                      <span className="mt-0.5 block text-[11px] text-gray-400">{haceCuanto(n.fecha_creacion)}</span>
                    </span>
                    {!n.leida && <span className="sr-only">(sin leer)</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/mensajes"
            onClick={() => setAbierto(false)}
            className="block border-t border-gray-100 px-4 py-2.5 text-center text-sm font-medium text-primary-600 hover:bg-gray-50"
          >
            Ver todos los mensajes
          </Link>
        </div>
      )}
    </div>
  );
}
