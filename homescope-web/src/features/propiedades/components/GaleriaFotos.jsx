import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, Home } from 'lucide-react';
import { Modal } from '../../../shared/components/ui';

function BotonFlecha({ direccion, onClick, className = '' }) {
  const Icono = direccion === 'anterior' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direccion === 'anterior' ? 'Foto anterior' : 'Foto siguiente'}
      className={[
        'absolute top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-secondary-800 shadow',
        'hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        direccion === 'anterior' ? 'left-2' : 'right-2',
        className,
      ].join(' ')}
    >
      <Icono size={20} aria-hidden="true" />
    </button>
  );
}

// fotos: [{ id, url, orden, es_portada }]; la portada se muestra primero y el resto según su orden
export default function GaleriaFotos({ fotos = [], titulo }) {
  const ordenadas = [...fotos].sort((a, b) => (b.es_portada - a.es_portada) || (a.orden - b.orden));
  const [actual, setActual] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const total = ordenadas.length;

  const anterior  = useCallback(() => setActual((i) => (i - 1 + total) % total), [total]);
  const siguiente = useCallback(() => setActual((i) => (i + 1) % total), [total]);
  const cerrar    = useCallback(() => setAmpliada(false), []);

  // En la vista ampliada se navega con las flechas del teclado
  useEffect(() => {
    if (!ampliada) return;
    function onKey(e) {
      if (e.key === 'ArrowLeft')  anterior();
      if (e.key === 'ArrowRight') siguiente();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ampliada, anterior, siguiente]);

  if (!total) {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-lg bg-secondary-100 text-secondary-400">
        <Home size={48} strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm">Esta propiedad aún no tiene fotos</p>
      </div>
    );
  }

  const foto = ordenadas[actual];

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-secondary-900">
        <button
          type="button"
          onClick={() => setAmpliada(true)}
          aria-label="Ver foto ampliada"
          className="group block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
        >
          <img
            src={foto.url}
            alt={`${titulo}: foto ${actual + 1} de ${total}`}
            fetchpriority={actual === 0 ? 'high' : undefined}
            className="h-full w-full object-cover"
          />
          <span className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-80 group-hover:opacity-100">
            <Expand size={16} aria-hidden="true" />
          </span>
        </button>
        {total > 1 && (
          <>
            <BotonFlecha direccion="anterior" onClick={anterior} />
            <BotonFlecha direccion="siguiente" onClick={siguiente} />
          </>
        )}
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          {actual + 1} / {total}
        </span>
      </div>

      {total > 1 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Miniaturas">
          {ordenadas.map((f, i) => (
            <li key={f.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActual(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === actual}
                className={[
                  'block h-14 w-20 overflow-hidden rounded border-2 sm:h-16 sm:w-24',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  i === actual ? 'border-primary-600' : 'border-transparent opacity-70 hover:opacity-100',
                ].join(' ')}
              >
                <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={ampliada} onClose={cerrar} title={`${titulo} · ${actual + 1} / ${total}`} size="xl">
        <div className="relative">
          <img
            src={foto.url}
            alt={`${titulo}: foto ${actual + 1} de ${total}`}
            className="mx-auto max-h-[75vh] w-full rounded object-contain"
          />
          {total > 1 && (
            <>
              <BotonFlecha direccion="anterior" onClick={anterior} />
              <BotonFlecha direccion="siguiente" onClick={siguiente} />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
