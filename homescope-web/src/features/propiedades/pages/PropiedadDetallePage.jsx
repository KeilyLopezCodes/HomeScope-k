import { useEffect, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ArrowLeft, Bath, BedDouble, Car, MapPin, Ruler } from 'lucide-react';
import { Badge, Button, EmptyState, Spinner } from '../../../shared/components/ui';
import NotFoundPage from '../../../shared/pages/NotFoundPage';
import { useAuth } from '../../auth';
import { IndiceConveniencia, SeccionPuntosInteres, Semaforo } from '../../indice';
import { ResenasPropiedad } from '../../resenas';
import GaleriaFotos from '../components/GaleriaFotos';
import HistorialPrecios from '../components/HistorialPrecios';
import VendedorCard from '../components/VendedorCard';
import AccionesPropiedad, { BotonFavorito } from '../components/AccionesPropiedad';
import { propiedadKey, usePropiedad } from '../hooks/usePropiedad';
import { registrarVista } from '../services/propiedadesService';
import { MODALIDAD, formatearPrecio, ubicacionResumida } from '../utils/formato';

const ESTADOS = {
  borrador:  'en borrador',
  pausado:   'pausada',
  vendido:   'vendida',
  alquilado: 'alquilada',
};

function Seccion({ titulo, children }) {
  return (
    <section className="rounded-lg border border-secondary-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-base font-semibold text-secondary-900">{titulo}</h2>
      {children}
    </section>
  );
}

// Precio, modalidad, tipo y ubicación: arriba en móvil y en el panel lateral en escritorio
function Resumen({ propiedad, className = '' }) {
  const modalidad = MODALIDAD[propiedad.modalidad];
  return (
    <div className={['rounded-lg border border-secondary-200 bg-white p-4', className].join(' ')}>
      <p className="text-2xl font-bold text-secondary-900">
        {formatearPrecio(propiedad.precio, propiedad.moneda)}
        {propiedad.modalidad === 'alquiler' && <span className="text-base font-normal text-secondary-500"> /mes</span>}
      </p>
      <h1 className="mt-1 text-base font-semibold text-secondary-800">{propiedad.titulo}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-secondary-600">
        {modalidad && <Badge variant={modalidad.variant}>{modalidad.etiqueta}</Badge>}
        <span className="capitalize">{propiedad.tipo_propiedad?.nombre}</span>
      </div>
      <p className="mt-2 flex items-start gap-1 text-sm text-secondary-600">
        <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {ubicacionResumida(propiedad)}
      </p>
      <Semaforo puntaje={propiedad.indice_conveniencia?.puntaje} className="mt-3" />
    </div>
  );
}

function Caracteristicas({ propiedad }) {
  const items = [
    propiedad.habitaciones != null && { icono: BedDouble, valor: propiedad.habitaciones, etiqueta: propiedad.habitaciones === 1 ? 'habitación' : 'habitaciones' },
    propiedad.banos != null        && { icono: Bath,      valor: Number(propiedad.banos), etiqueta: Number(propiedad.banos) === 1 ? 'baño' : 'baños' },
    propiedad.area_m2 != null      && { icono: Ruler,     valor: Number(propiedad.area_m2).toLocaleString('es-GT'), etiqueta: 'm²' },
    propiedad.parqueos != null     && { icono: Car,       valor: propiedad.parqueos, etiqueta: propiedad.parqueos === 1 ? 'parqueo' : 'parqueos' },
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(({ icono: Icono, valor, etiqueta }) => (
        <li key={etiqueta} className="flex items-center gap-2 rounded-lg border border-secondary-200 bg-white px-3 py-2.5">
          <Icono size={18} className="shrink-0 text-primary-600" aria-hidden="true" />
          <span className="text-sm text-secondary-700">
            <span className="font-semibold text-secondary-900">{valor}</span> {etiqueta}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AvisoEstado({ propiedad }) {
  const estado = ESTADOS[propiedad.estado] ?? propiedad.estado;
  return (
    <div role="status" className="flex items-start gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-semibold">Esta propiedad está {estado}.</span>{' '}
        {propiedad.es_dueno
          ? 'Solo tú puedes verla; para los demás usuarios no aparece en el catálogo ni en esta dirección.'
          : 'La ves como administrador; no es visible para el público.'}
      </p>
    </div>
  );
}

export default function PropiedadDetallePage() {
  const { id } = useParams();
  const { state } = useLocation();
  const { user, sesionVerificada } = useAuth();
  const idValido = /^\d+$/.test(id);

  const queryKey = propiedadKey(id, user?.id ?? null);
  const { data: propiedad, isPending, isError, error, refetch } =
    usePropiedad(id, { usuarioId: user?.id ?? null, enabled: idValido && sesionVerificada });

  // Registra la vista una vez por ficha para el historial del comprador (el backend ignora al dueño)
  const vistaRegistrada = useRef(null);
  useEffect(() => {
    if (!user || !propiedad || propiedad.es_dueno || propiedad.estado !== 'publicado') return;
    if (vistaRegistrada.current === propiedad.id) return;
    vistaRegistrada.current = propiedad.id;
    registrarVista(propiedad.id).catch(() => {});
  }, [user, propiedad]);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  if (!idValido || [400, 404].includes(error?.status)) return <NotFoundPage />;

  if (isPending) return <Spinner size="lg" label="Cargando propiedad…" className="py-32" />;

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="No se pudo cargar la propiedad"
        description={error?.message ?? 'Intenta de nuevo en unos momentos.'}
        action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}
      />
    );
  }

  const ubicacionCompleta = [propiedad.direccion, ubicacionResumida(propiedad)]
    .filter((v, i, arr) => v && arr.indexOf(v) === i).join(' · ');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          to={state?.desde ?? '/propiedades'}
          className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-secondary-700 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Volver al catálogo
        </Link>
        <div className="lg:hidden">
          <BotonFavorito propiedad={propiedad} queryKey={queryKey} variante="icono" />
        </div>
      </div>

      {propiedad.estado !== 'publicado' && <AvisoEstado propiedad={propiedad} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <GaleriaFotos fotos={propiedad.fotos} titulo={propiedad.titulo} />
          <Resumen propiedad={propiedad} className="lg:hidden" />
          <Caracteristicas propiedad={propiedad} />

          <IndiceConveniencia indice={propiedad.indice_conveniencia} />

          <Seccion titulo="Ubicación y puntos de interés">
            <SeccionPuntosInteres propiedad={propiedad} direccion={ubicacionCompleta} />
          </Seccion>

          <Seccion titulo="Descripción">
            {propiedad.descripcion
              ? <p className="whitespace-pre-line text-sm leading-relaxed text-secondary-700">{propiedad.descripcion}</p>
              : <p className="text-sm text-secondary-500">El vendedor no agregó una descripción.</p>}
          </Seccion>

          <Seccion titulo="Historial de precios">
            <HistorialPrecios
              historial={propiedad.historial_precios}
              moneda={propiedad.moneda}
              fechaPublicacion={propiedad.fecha_publicacion}
            />
          </Seccion>

          <Seccion titulo="Reseñas">
            <ResenasPropiedad />
          </Seccion>
        </div>

        {/* Panel lateral fijo en escritorio; en móvil queda al final, después del contenido */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Resumen propiedad={propiedad} className="hidden lg:block" />
          <VendedorCard vendedor={propiedad.vendedor} />
          <AccionesPropiedad propiedad={propiedad} queryKey={queryKey} />
        </aside>
      </div>
    </div>
  );
}
