import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, LogIn, RefreshCw, WifiOff, X } from 'lucide-react';
import { useToast } from '../../../shared/components/ui';
import { INTERVALO_SIN_CONEXION_MS, useSocket } from '../../../shared/realtime/SocketProvider';

// Un corte de unos segundos (cambio de red, reinicio del servidor) se arregla solo: no vale la pena avisar
const ESPERA_ANTES_DE_AVISAR_MS = 3000;
const SEGUNDOS_RESPALDO = INTERVALO_SIN_CONEXION_MS / 1000;

const AVISOS = {
  reconectando: {
    Icono: Loader2, girar: true,
    titulo: 'Se perdió la conexión en tiempo real',
    detalle: `Estamos reconectando. Puedes seguir enviando mensajes; los nuevos aparecerán cada ${SEGUNDOS_RESPALDO} segundos mientras tanto.`,
  },
  sin_internet: {
    Icono: WifiOff,
    titulo: 'Sin conexión a internet',
    detalle: 'Cuando vuelva la conexión, tus mensajes y notificaciones se pondrán al día solos.',
  },
  sesion_expirada: {
    Icono: LogIn,
    titulo: 'Tu sesión expiró',
    detalle: 'Inicia sesión de nuevo para seguir recibiendo mensajes en tiempo real.',
  },
};

// Aviso global del estado de la conexión de Socket.io (montado una vez en App)
export default function EstadoConexion() {
  const { socket, estado } = useSocket();
  const toast = useToast();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(null); // estado que se está avisando
  const [cerrado, setCerrado] = useState(false);
  const huboAviso = useRef(false);

  useEffect(() => {
    if (AVISOS[estado]) {
      setCerrado(false);
      // La sesión expirada se avisa enseguida; los cortes de red, solo si duran más de unos segundos
      const espera = estado === 'sesion_expirada' ? 0 : ESPERA_ANTES_DE_AVISAR_MS;
      const id = setTimeout(() => { setVisible(estado); huboAviso.current = true; }, espera);
      return () => clearTimeout(id);
    }
    setVisible(null);
    if (estado === 'conectado' && huboAviso.current) {
      huboAviso.current = false;
      toast('Conexión restablecida. Tus mensajes están al día.', 'success', 3500);
    }
    if (estado === 'inactivo') huboAviso.current = false;
  }, [estado]); // toast es estable

  if (!visible || cerrado) return null;
  const { Icono, girar, titulo, detalle } = AVISOS[visible];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-[90] flex w-[22rem] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-secondary-800 shadow-md"
    >
      <Icono size={18} aria-hidden="true" className={['mt-0.5 shrink-0 text-warning-600', girar ? 'animate-spin' : ''].join(' ')} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{titulo}</p>
        <p className="mt-0.5 text-xs text-secondary-600">{detalle}</p>
        {visible === 'reconectando' && socket && (
          <button
            type="button"
            onClick={() => socket.connect()}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <RefreshCw size={12} aria-hidden="true" /> Reintentar ahora
          </button>
        )}
        {visible === 'sesion_expirada' && (
          <Link
            to="/login"
            state={{ from: pathname }}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
          >
            <LogIn size={12} aria-hidden="true" /> Iniciar sesión
          </Link>
        )}
      </div>
      {visible !== 'sesion_expirada' && (
        <button
          type="button"
          onClick={() => setCerrado(true)}
          aria-label="Ocultar aviso"
          className="rounded p-0.5 text-secondary-400 hover:text-secondary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
