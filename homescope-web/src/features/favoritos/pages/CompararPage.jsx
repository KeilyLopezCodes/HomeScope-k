import { useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, GitCompare, Home, Plus, Trophy, X } from 'lucide-react';
import { Button, EmptyState, Spinner } from '../../../shared/components/ui';
import { CATEGORIAS, Semaforo } from '../../indice';
import { formatearDistancia } from '../../indice/config/categorias';
import { MODALIDAD, formatearPrecio, ubicacionResumida } from '../../propiedades/utils/formato';
import { compararPropiedades } from '../services/favoritosService';
import { MAX_COMPARAR, useComparador } from '../hooks/useComparador';
import { BotonFavoritoTarjeta } from '../components/BotonesTarjeta';

const leerIds = (texto) => [...new Set((texto ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, MAX_COMPARAR);
const numeroONull = (v) => (v == null || v === '' ? null : Number(v));
const mismaMonedaYModalidad = (ps) => ps.every((p) => p.moneda === ps[0].moneda && p.modalidad === ps[0].modalidad);

// Filas de datos. numero: valor para elegir la mejor; mejor: 'max' | 'min'; comparable: si tiene sentido comparar
const FILAS_DATOS = [
  {
    etiqueta: 'Precio',
    valor: (p) => `${formatearPrecio(p.precio, p.moneda)}${p.modalidad === 'alquiler' ? ' /mes' : ''}`,
    numero: (p) => Number(p.precio), mejor: 'min', comparable: mismaMonedaYModalidad,
  },
  {
    etiqueta: 'Precio por m²',
    valor: (p) => (p.area_m2 ? formatearPrecio(Number(p.precio) / Number(p.area_m2), p.moneda) : '—'),
    numero: (p) => (p.area_m2 ? Number(p.precio) / Number(p.area_m2) : null), mejor: 'min', comparable: mismaMonedaYModalidad,
  },
  { etiqueta: 'Tipo',         valor: (p) => <span className="capitalize">{p.tipo_propiedad?.nombre ?? '—'}</span> },
  { etiqueta: 'Modalidad',    valor: (p) => MODALIDAD[p.modalidad]?.etiqueta ?? p.modalidad },
  { etiqueta: 'Habitaciones', valor: (p) => p.habitaciones ?? '—', numero: (p) => numeroONull(p.habitaciones), mejor: 'max' },
  { etiqueta: 'Baños',        valor: (p) => (p.banos != null ? Number(p.banos) : '—'), numero: (p) => numeroONull(p.banos), mejor: 'max' },
  {
    etiqueta: 'Área',
    valor: (p) => (p.area_m2 != null ? `${Number(p.area_m2).toLocaleString('es-GT')} m²` : '—'),
    numero: (p) => numeroONull(p.area_m2), mejor: 'max',
  },
  { etiqueta: 'Parqueos',     valor: (p) => p.parqueos ?? '—', numero: (p) => numeroONull(p.parqueos), mejor: 'max' },
  { etiqueta: 'Ubicación',    valor: (p) => ubicacionResumida(p) },
];

// Ids con el mejor valor de la fila (ninguno si hay menos de 2 valores o todos empatan)
function mejores(fila, propiedades) {
  if (!fila.numero || propiedades.length < 2 || (fila.comparable && !fila.comparable(propiedades))) return new Set();
  const valores = propiedades.map((p) => [p.id, fila.numero(p)]).filter(([, v]) => v != null && !Number.isNaN(v));
  if (valores.length < 2) return new Set();
  const objetivo = (fila.mejor === 'min' ? Math.min : Math.max)(...valores.map(([, v]) => v));
  const ganadores = valores.filter(([, v]) => v === objetivo).map(([id]) => id);
  return ganadores.length === valores.length ? new Set() : new Set(ganadores);
}

function Celda({ children, esMejor }) {
  return (
    <td className={['border-b border-secondary-100 px-3 py-2.5 align-top text-sm', esMejor ? 'bg-success-50' : ''].join(' ')}>
      <span className={esMejor ? 'font-semibold text-secondary-900' : 'text-secondary-700'}>{children}</span>
      {esMejor && (
        <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-success-700">
          <Trophy size={12} aria-hidden="true" /> Mejor
        </span>
      )}
    </td>
  );
}

function FilaEtiqueta({ children, nivel = 'dato' }) {
  return (
    <th
      scope="row"
      className={[
        'sticky left-0 z-10 w-24 border-b border-secondary-100 bg-white px-2 py-2.5 text-left align-top text-xs font-medium text-secondary-500 sm:w-36 sm:px-3',
        nivel === 'categoria' ? 'sm:pl-6' : '',
      ].join(' ')}
    >
      {children}
    </th>
  );
}

function Subpuntaje({ sub, radio }) {
  if (!sub) return <span className="text-secondary-400">—</span>;
  return (
    <span className="block min-w-[8rem]">
      <span className="flex items-baseline gap-1">
        <span className="tabular-nums">{Math.round(sub.puntaje)}</span>
        <span className="text-xs font-normal text-secondary-400">/100</span>
      </span>
      <span className="mt-1 block h-1.5 rounded-full bg-secondary-100" aria-hidden="true">
        <span className="block h-1.5 rounded-full bg-primary-600" style={{ width: `${Math.max(0, Math.min(100, sub.puntaje))}%` }} />
      </span>
      <span className="mt-1 block text-xs font-normal text-secondary-500">
        {sub.cantidad_puntos} {sub.cantidad_puntos === 1 ? 'lugar' : 'lugares'}
        {radio ? ` en ${formatearDistancia(radio)}` : ''}
        {sub.distancia_minima_m != null && ` · el más cercano a ${formatearDistancia(sub.distancia_minima_m)}`}
      </span>
    </span>
  );
}

export default function CompararPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const comparador = useComparador();
  const sincronizado = useRef(false);

  // Una URL compartida (/comparar?ids=…) define la selección; después la URL sigue a la selección
  useEffect(() => {
    if (sincronizado.current) return;
    sincronizado.current = true;
    const desdeUrl = leerIds(params.get('ids'));
    if (desdeUrl.length) comparador.reemplazar(desdeUrl);
  }, []);
  useEffect(() => {
    if (!sincronizado.current) return;
    const texto = comparador.ids.join(',');
    // Con navigate (no setParams) la coma queda legible en la URL: ?ids=12,15 en vez de ?ids=12%2C15
    if ((params.get('ids') ?? '') !== texto) navigate(texto ? `/comparar?ids=${texto}` : '/comparar', { replace: true });
  }, [comparador.ids]);

  const ids = comparador.ids;
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['propiedades', 'comparar', ids],
    queryFn:  () => compararPropiedades(ids),
    enabled:  ids.length > 0,
    placeholderData: keepPreviousData,
  });

  // Las que dejaron de estar publicadas salen del comparador
  const noDisponibles = data?.no_disponibles ?? [];
  useEffect(() => {
    if (noDisponibles.length) comparador.reemplazar(ids.filter((id) => !noDisponibles.includes(id)));
  }, [noDisponibles.join(',')]);

  if (!ids.length) return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-secondary-900">Comparar propiedades</h1>
      <EmptyState
        icon={GitCompare}
        title="Aún no elegiste propiedades para comparar"
        description={`Usa el botón de comparar en el catálogo o en tus favoritos para elegir hasta ${MAX_COMPARAR}.`}
        action={(
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate('/propiedades')}>Ir al catálogo</Button>
            <Button variant="secondary" onClick={() => navigate('/favoritos')}>Mis favoritos</Button>
          </div>
        )}
      />
    </div>
  );

  // En el orden en que se eligieron
  const propiedades = (data?.data ?? []).slice().sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  const conIndice = propiedades.filter((p) => p.indice_conveniencia);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Comparar propiedades</h1>
          <p className="text-sm text-secondary-500">
            {ids.length} de {MAX_COMPARAR}. <Trophy size={13} className="inline align-text-bottom text-success-700" aria-hidden="true" /> marca el mejor valor de cada fila.
          </p>
        </div>
        <div className="flex gap-2">
          {ids.length < MAX_COMPARAR && (
            <Button variant="secondary" size="sm" onClick={() => navigate('/propiedades')}><Plus size={14} aria-hidden="true" /> Agregar</Button>
          )}
          <Button variant="text" size="sm" onClick={comparador.limpiar}><X size={14} aria-hidden="true" /> Vaciar</Button>
        </div>
      </div>

      {noDisponibles.length > 0 && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {noDisponibles.length === 1 ? 'Una propiedad ya no está publicada y' : `${noDisponibles.length} propiedades ya no están publicadas y`} se quitó del comparador.
        </p>
      )}
      {ids.length === 1 && !isPending && (
        <p className="mb-4 text-sm text-secondary-600">Agrega al menos otra propiedad para compararlas.</p>
      )}

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <EmptyState icon={AlertTriangle} title="No se pudo cargar la comparación"
          action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>} />
      ) : (
        <div className={['overflow-x-auto rounded-lg border border-secondary-200 bg-white transition-opacity', isFetching ? 'opacity-70' : ''].join(' ')}>
          <table className="w-full border-separate border-spacing-0" style={{ minWidth: `${6 + propiedades.length * 13}rem` }}>
            <caption className="sr-only">Comparación de {propiedades.length} propiedades lado a lado</caption>
            <thead>
              <tr>
                <td className="sticky left-0 z-10 w-24 border-b sm:w-36 border-secondary-200 bg-white" />
                {propiedades.map((p) => (
                  <th key={p.id} scope="col" className="w-56 border-b border-secondary-200 p-3 text-left align-top font-normal">
                    <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded bg-secondary-100">
                      {p.fotos?.[0]?.url
                        ? <img src={p.fotos[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        : <div className="flex h-full items-center justify-center text-secondary-300"><Home size={32} aria-hidden="true" /></div>}
                      <div className="absolute right-1.5 top-1.5 flex gap-1.5">
                        <BotonFavoritoTarjeta propiedad={p} />
                        <button
                          type="button"
                          onClick={() => comparador.quitar(p.id)}
                          aria-label={`Quitar "${p.titulo}" de la comparación`}
                          title="Quitar de la comparación"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-secondary-700 shadow-sm ring-1 ring-black/5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                          <X size={18} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <Link to={`/propiedades/${p.id}`} className="line-clamp-2 text-sm font-semibold text-secondary-900 hover:text-primary-700">
                      {p.titulo}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FILAS_DATOS.map((fila) => {
                const ganadores = mejores(fila, propiedades);
                return (
                  <tr key={fila.etiqueta}>
                    <FilaEtiqueta>{fila.etiqueta}</FilaEtiqueta>
                    {propiedades.map((p) => <Celda key={p.id} esMejor={ganadores.has(p.id)}>{fila.valor(p)}</Celda>)}
                  </tr>
                );
              })}

              {/* Índice de Conveniencia y su desglose */}
              <tr>
                <th colSpan={propiedades.length + 1} scope="rowgroup" className="border-b border-secondary-200 bg-secondary-50 px-3 py-2 text-left text-sm font-semibold text-secondary-900">
                  <span className="sticky left-3">Índice de Conveniencia</span>
                </th>
              </tr>
              {(() => {
                const fila = { numero: (p) => p.indice_conveniencia?.puntaje ?? null, mejor: 'max' };
                const ganadores = mejores(fila, propiedades);
                return (
                  <tr>
                    <FilaEtiqueta>Puntaje total</FilaEtiqueta>
                    {propiedades.map((p) => (
                      <Celda key={p.id} esMejor={ganadores.has(p.id)}>
                        {p.indice_conveniencia ? (
                          <span className="flex flex-col gap-1">
                            <span className="text-lg tabular-nums">{Math.round(p.indice_conveniencia.puntaje)}<span className="text-xs font-normal text-secondary-400">/100</span></span>
                            <Semaforo puntaje={p.indice_conveniencia.puntaje} nivel={p.indice_conveniencia.nivel} />
                          </span>
                        ) : <span className="text-secondary-400">En cálculo</span>}
                      </Celda>
                    ))}
                  </tr>
                );
              })()}
              {conIndice.length > 0 && Object.entries(CATEGORIAS).map(([codigo, { nombre, Icono }]) => {
                const sub = (p) => p.indice_conveniencia?.subpuntajes?.find((s) => s.categoria === codigo);
                const ganadores = mejores({ numero: (p) => sub(p)?.puntaje ?? null, mejor: 'max' }, propiedades);
                const peso = conIndice.map(sub).find(Boolean)?.peso;
                return (
                  <tr key={codigo}>
                    <FilaEtiqueta nivel="categoria">
                      <span className="flex items-center gap-1.5">
                        <Icono size={14} aria-hidden="true" /> {nombre}
                      </span>
                      {peso != null && <span className="block text-[11px] font-normal text-secondary-400">Peso {Math.round(peso * 100)} %</span>}
                    </FilaEtiqueta>
                    {propiedades.map((p) => (
                      <Celda key={p.id} esMejor={ganadores.has(p.id)}>
                        <Subpuntaje sub={sub(p)} radio={p.indice_conveniencia?.radio_m} />
                      </Celda>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
