import { useMemo, useState } from 'react';
import { AlertCircle, Loader2, MapPin } from 'lucide-react';
import { Button } from '../../../shared/components/ui';
import { MapaPropiedad } from '../../mapa';
import { usePuntosInteres } from '../hooks/usePuntosInteres';
import { CATEGORIAS, CODIGOS_CATEGORIA, RADIOS, formatearDistancia } from '../config/categorias';
import PuntosInteres, { IconoCategoria } from './PuntosInteres';

const RADIO_INICIAL = 1000;

function SelectorRadio({ valor, onChange }) {
  return (
    <div role="radiogroup" aria-label="Radio de búsqueda" className="inline-flex rounded-md bg-secondary-100 p-0.5">
      {RADIOS.map((r) => (
        <button
          key={r.valor}
          type="button"
          role="radio"
          aria-checked={valor === r.valor}
          onClick={() => onChange(r.valor)}
          className={[
            'rounded px-3 py-1.5 text-xs font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            valor === r.valor ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-600 hover:text-secondary-900',
          ].join(' ')}
        >
          {r.etiqueta}
        </button>
      ))}
    </div>
  );
}

function FiltroCategorias({ seleccion, onToggle }) {
  return (
    <div role="group" aria-label="Categorías" className="flex flex-wrap gap-1.5">
      {CODIGOS_CATEGORIA.map((codigo) => {
        const activa = seleccion.includes(codigo);
        // Siempre queda al menos una categoría seleccionada
        const unica = activa && seleccion.length === 1;
        return (
          <button
            key={codigo}
            type="button"
            aria-pressed={activa}
            disabled={unica}
            title={unica ? 'Debe quedar al menos una categoría' : undefined}
            onClick={() => onToggle(codigo)}
            className={[
              'inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed',
              activa
                ? 'border-secondary-300 bg-white text-secondary-800 shadow-sm'
                : 'border-transparent bg-secondary-100 text-secondary-400 opacity-70 hover:opacity-100',
            ].join(' ')}
          >
            <IconoCategoria categoria={codigo} size={12} className={['h-5 w-5', activa ? '' : 'grayscale'].join(' ')} />
            {CATEGORIAS[codigo].nombre}
          </button>
        );
      })}
    </div>
  );
}

// Mapa con los puntos de interés de la propiedad, selector de radio y filtro de categorías
export default function SeccionPuntosInteres({ propiedad, direccion }) {
  const [radio, setRadio] = useState(RADIO_INICIAL);
  const [categorias, setCategorias] = useState(CODIGOS_CATEGORIA);
  const tieneCoordenadas = propiedad.latitud != null && propiedad.longitud != null;

  const { data, isPending, isError, error, isFetching, isPlaceholderData, refetch } =
    usePuntosInteres(propiedad.id, { radio, categorias, enabled: tieneCoordenadas });

  function alternarCategoria(codigo) {
    setCategorias((actual) => actual.includes(codigo)
      ? actual.filter((c) => c !== codigo)
      // Se conserva el orden fijo de las categorías para que la clave de la consulta sea estable
      : CODIGOS_CATEGORIA.filter((c) => c === codigo || actual.includes(c)));
  }

  const marcadores = useMemo(() => (data?.categorias ?? []).flatMap((g) =>
    g.puntos.map((p) => ({
      id:      p.place_id,
      lat:     p.latitud,
      lng:     p.longitud,
      titulo:  p.nombre,
      detalle: `${CATEGORIAS[g.categoria].nombre} · ${formatearDistancia(p.distancia_m)} · ${p.tiempo_estimado.caminando_min} min a pie`,
      color:   CATEGORIAS[g.categoria].color,
      Icono:   CATEGORIAS[g.categoria].Icono,
    }))), [data]);

  const total = data?.categorias.reduce((n, g) => n + g.total, 0) ?? 0;

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-1 text-sm text-secondary-600">
        <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {direccion}
      </p>

      {tieneCoordenadas && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SelectorRadio valor={radio} onChange={setRadio} />
          <p className="flex items-center gap-1.5 text-xs text-secondary-500" aria-live="polite">
            {isFetching && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
            {isFetching
              ? 'Actualizando puntos de interés…'
              : data && `${total} ${total === 1 ? 'lugar' : 'lugares'} a menos de ${formatearDistancia(radio)}`}
          </p>
        </div>
      )}
      {tieneCoordenadas && <FiltroCategorias seleccion={categorias} onToggle={alternarCategoria} />}

      <MapaPropiedad
        latitud={propiedad.latitud}
        longitud={propiedad.longitud}
        direccion={direccion}
        titulo={propiedad.titulo}
        marcadores={marcadores}
        radio={tieneCoordenadas ? radio : null}
      />

      {!tieneCoordenadas ? (
        <p className="text-sm text-secondary-500">
          Esta propiedad no tiene su ubicación exacta registrada, por eso no podemos mostrar los puntos de interés cercanos.
        </p>
      ) : isPending ? (
        <p className="flex items-center gap-2 text-sm text-secondary-500">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Buscando puntos de interés cercanos…
        </p>
      ) : isError ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-danger-50 p-3 text-sm text-danger-700">
          <AlertCircle size={16} aria-hidden="true" />
          <span className="flex-1">{error?.message ?? 'No se pudieron cargar los puntos de interés.'}</span>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>Reintentar</Button>
        </div>
      ) : (
        <div className={['transition-opacity', isPlaceholderData ? 'opacity-60' : ''].join(' ')} aria-busy={isPlaceholderData}>
          <PuntosInteres grupos={data.categorias} radio={data.radio_m} />
          <p className="mt-4 text-xs text-secondary-400">
            Distancias en línea recta; los tiempos son estimados. Datos de Google.
          </p>
        </div>
      )}
    </div>
  );
}
