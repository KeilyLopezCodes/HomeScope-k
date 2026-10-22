import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Home, List, MapPin, SearchX } from 'lucide-react';
import { Button, EmptyState } from '../../../shared/components/ui';
import { BarraBusqueda, FiltrosActivos, PanelFiltros, escribirFiltros, useFiltrosCatalogo } from '../../busqueda';
import { Semaforo } from '../../indice';
import { listarPropiedades } from '../../propiedades/services/propiedadesService';
import { formatearPrecio, ubicacionResumida } from '../../propiedades/utils/formato';
import { CENTRO_GUATEMALA } from '../services/googleMaps';
import MapaResultados from '../components/MapaResultados';

// Hasta cuántas propiedades del área visible se piden de una vez (el backend admite 100 con bbox)
const MAX_EN_MAPA = 100;
const VISTA_INICIAL = { centro: CENTRO_GUATEMALA, zoom: 7 };

// ?mapa=14.6349,-90.5069,13 → { centro, zoom } (lo inválido se ignora)
function leerVista(texto) {
  const [lat, lng, zoom] = (texto ?? '').split(',').map(Number);
  if (![lat, lng, zoom].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || zoom < 3 || zoom > 21) return VISTA_INICIAL;
  return { centro: { lat, lng }, zoom };
}
const escribirVista = ({ centro, zoom }) => `${centro.lat.toFixed(5)},${centro.lng.toFixed(5)},${zoom}`;

function ItemResultado({ p, seleccionada, onSeleccionar, onResaltar }) {
  const portada = p.fotos?.[0]?.url;
  return (
    <li
      onMouseEnter={() => onResaltar(p.id)}
      onMouseLeave={() => onResaltar(null)}
      className={[
        'flex gap-3 rounded-lg border bg-white p-2 transition-colors',
        seleccionada ? 'border-primary-500 ring-2 ring-primary-200' : 'border-secondary-200 hover:border-primary-300',
      ].join(' ')}
    >
      <div className="h-20 w-24 shrink-0 overflow-hidden rounded bg-secondary-100">
        {portada
          ? <img src={portada} alt="" loading="lazy" className="h-full w-full object-cover" />
          : <div className="flex h-full items-center justify-center text-secondary-300"><Home size={22} aria-hidden="true" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-secondary-900">
          {formatearPrecio(p.precio, p.moneda)}
          {p.modalidad === 'alquiler' && <span className="text-xs font-normal text-secondary-500"> /mes</span>}
        </p>
        <Link to={`/propiedades/${p.id}`} className="line-clamp-1 text-sm font-medium text-secondary-800 hover:text-primary-700">{p.titulo}</Link>
        <p className="line-clamp-1 text-xs text-secondary-500">{ubicacionResumida(p)}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <Semaforo puntaje={p.indice_conveniencia?.puntaje} nivel={p.indice_conveniencia?.nivel} />
          <button
            type="button"
            onClick={() => onSeleccionar(p.id)}
            aria-label={`Ver "${p.titulo}" en el mapa`}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <MapPin size={12} aria-hidden="true" /> En el mapa
          </button>
        </div>
      </div>
    </li>
  );
}

// Búsqueda en el mapa: las propiedades del área visible con los mismos filtros del catálogo.
// Filtros y vista del mapa viven en la URL (?modalidad=venta&mapa=14.63,-90.51,13)
export default function BusquedaMapaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { filtros, hayFiltros, actualizar, quitar, limpiar } = useFiltrosCatalogo();
  const [vistaInicial] = useState(() => leerVista(searchParams.get('mapa')));
  const [area, setArea] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);
  const [resaltada, setResaltada] = useState(null);
  const ultimaVista = useRef(null);
  const contenedorMapa = useRef(null);

  // Los filtros cambian la URL sin la vista del mapa: se vuelve a escribir para no perderla
  useEffect(() => {
    if (!searchParams.get('mapa') && ultimaVista.current)
      setSearchParams((p) => { p.set('mapa', ultimaVista.current); return p; }, { replace: true });
  }, [searchParams]);

  function alMoverMapa({ bbox, centro, zoom }) {
    setArea(bbox);
    ultimaVista.current = escribirVista({ centro, zoom });
    if (searchParams.get('mapa') !== ultimaVista.current)
      setSearchParams((p) => { p.set('mapa', ultimaVista.current); return p; }, { replace: true });
  }

  const paramsFiltros = escribirFiltros(filtros);
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['propiedades', 'mapa', paramsFiltros.toString(), area?.join(',')],
    queryFn: () => {
      const params = new URLSearchParams(paramsFiltros);
      params.set('bbox', area.join(','));
      return listarPropiedades({ page: 1, pageSize: MAX_EN_MAPA, params });
    },
    enabled: Boolean(area),
    // Mientras llegan los resultados del área nueva se siguen viendo los anteriores
    placeholderData: keepPreviousData,
  });
  const propiedades = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;

  // Si la seleccionada sale del área visible, se cierra su tarjeta
  useEffect(() => {
    if (seleccionada && data && !propiedades.some((p) => p.id === seleccionada)) setSeleccionada(null);
  }, [propiedades]);

  const enlaceLista = `/propiedades${paramsFiltros.toString() ? `?${paramsFiltros}` : ''}`;
  // En pantallas pequeñas la lista está debajo del mapa: se sube hasta él
  function verEnMapa(id) {
    setSeleccionada(id);
    if (contenedorMapa.current?.getBoundingClientRect().top < 0) contenedorMapa.current.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Buscar en el mapa</h1>
          <p className="text-sm text-secondary-500">Mueve el mapa o acércate: los resultados se actualizan con el área visible.</p>
        </div>
        <Link to={enlaceLista} className="inline-flex items-center gap-1.5 rounded bg-secondary-100 px-3 py-1.5 text-sm font-medium text-secondary-800 hover:bg-secondary-200">
          <List size={16} aria-hidden="true" /> Ver como lista
        </Link>
      </div>

      <div className="mb-4 space-y-3">
        <BarraBusqueda valor={filtros.q ?? ''} onBuscar={(q) => actualizar({ q })} />
        <PanelFiltros filtros={filtros} onCambiar={actualizar} />
        <FiltrosActivos filtros={filtros} onQuitar={quitar} onLimpiar={limpiar} />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-secondary-600" aria-live="polite">
          {!area ? 'Cargando el mapa…' : `${total} ${total === 1 ? 'propiedad' : 'propiedades'} en esta zona${hayFiltros ? ' con los filtros activos' : ''}`}
          {isFetching && area && <span className="ml-2 text-secondary-400">Actualizando…</span>}
          {total > propiedades.length && (
            <span className="block text-xs text-secondary-500">Se muestran {propiedades.length}: acércate para ver el resto.</span>
          )}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Siempre visible: Google Maps no se dibuja bien dentro de un contenedor oculto */}
        <div ref={contenedorMapa} className="h-[55vh] min-h-[20rem] scroll-mt-20 lg:h-[65vh]">
          <MapaResultados
            propiedades={propiedades}
            vistaInicial={vistaInicial}
            onArea={alMoverMapa}
            seleccionada={seleccionada}
            onSeleccionar={setSeleccionada}
            resaltada={resaltada}
            onVerFicha={(id) => navigate(`/propiedades/${id}`)}
          />
        </div>

        <section aria-label="Resultados en esta zona" className="lg:h-[65vh] lg:overflow-y-auto lg:pr-1">
          {isError ? (
            <EmptyState title="No se pudieron cargar las propiedades" action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>} />
          ) : area && data && propiedades.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No hay propiedades en esta zona"
              description={hayFiltros ? 'Prueba alejar el mapa o quitar algún filtro.' : 'Prueba alejar el mapa o moverlo a otra zona.'}
              action={hayFiltros ? <Button variant="secondary" onClick={limpiar}>Limpiar filtros</Button> : null}
            />
          ) : (
            <ul className={['space-y-2 transition-opacity', isFetching ? 'opacity-70' : ''].join(' ')}>
              {propiedades.map((p) => (
                <ItemResultado key={p.id} p={p} seleccionada={p.id === seleccionada} onSeleccionar={verEnMapa} onResaltar={setResaltada} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
