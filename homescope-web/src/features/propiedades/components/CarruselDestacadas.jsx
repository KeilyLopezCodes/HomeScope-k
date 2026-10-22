import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flame, MapPin, Pause, Play, Sparkles } from 'lucide-react';
import { Badge } from '../../../shared/components/ui';
import { useDestacadas } from '../hooks/useDestacadas';
import { formatearPrecio } from '../utils/formato';

const INTERVALO_MS = 3000;
const UMBRAL_DESLIZAR_PX = 50;
// Misma caja en todos los estados (esqueleto incluido): la página no salta al cargar
const ALTO = 'aspect-[4/3] md:aspect-auto md:h-[440px]';

const MOTIVO = {
  reciente: { etiqueta: 'Nueva',   variant: 'success', Icono: Sparkles },
  popular:  { etiqueta: 'Popular', variant: 'warning', Icono: Flame },
};

const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const botonRedondo = 'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 text-secondary-800 shadow-md '
  + 'hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600';

function Diapositiva({ p, indice, total, actual, onClickCapturado }) {
  const motivo = MOTIVO[p.motivo] ?? MOTIVO.reciente;
  const visible = indice === actual;
  return (
    <div
      role="group"
      aria-roledescription="diapositiva"
      aria-label={`${indice + 1} de ${total}`}
      aria-hidden={!visible}
      // Las ocultas no reciben foco: con Tab solo se llega al enlace de la que se ve
      {...(!visible && { inert: '' })}
      className="h-full w-full shrink-0"
    >
      <Link
        to={`/propiedades/${p.id}`}
        onClickCapture={onClickCapturado}
        className="group relative block h-full w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary-300"
      >
        <img
          src={p.foto_url}
          alt={p.titulo}
          // La primera de inmediato; las demás cuando hacen falta
          loading={indice === 0 ? 'eager' : 'lazy'}
          fetchpriority={indice === 0 ? 'high' : 'low'}
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none"
        />
        {/* Franja oscura: el texto se lee sobre cualquier foto */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/60 to-black/0 px-4 pb-9 pt-8 text-white sm:px-8 sm:pb-12 sm:pt-12">
          <Badge variant={motivo.variant} className="mb-1 shadow-sm sm:mb-2">
            <motivo.Icono size={12} aria-hidden="true" /> {motivo.etiqueta}
          </Badge>
          <p className="text-xl font-bold drop-shadow sm:text-3xl">
            {formatearPrecio(p.precio, p.moneda)}
            {p.modalidad === 'alquiler' && <span className="text-base font-normal"> /mes</span>}
          </p>
          {/* En pantallas pequeñas no cabe sin tapar la foto: el título completo está en la ficha */}
          <p className="hidden line-clamp-1 text-sm font-medium text-white/95 sm:block sm:text-base">{p.titulo}</p>
          {p.ubicacion && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-white/90 sm:text-sm">
              <MapPin size={14} className="shrink-0" aria-hidden="true" />
              <span className="line-clamp-1">{p.ubicacion}</span>
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

// Carrusel de propiedades destacadas en la parte superior del catálogo.
// Avanza cada 6 s en ciclo; se pausa con el botón, con el mouse encima o con el foco del teclado dentro,
// y empieza en pausa si el sistema pide reducir el movimiento (WCAG 2.2.2 Pausar, detener, ocultar)
export default function CarruselDestacadas() {
  const { data, isPending, isError } = useDestacadas();
  const propiedades = data?.data ?? [];
  const total = propiedades.length;

  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(prefiereMenosMovimiento);
  const [encima, setEncima] = useState(false);
  const [conFoco, setConFoco] = useState(false);
  const toque = useRef(null);         // { x, y } al empezar a deslizar
  const deslizo = useRef(false);      // si el gesto fue un deslizamiento, no se abre la ficha
  const contenedor = useRef(null);

  const ciclo = useCallback((i) => ((i % total) + total) % total, [total]);
  const ir = (i) => setActual(ciclo(i));
  // Actualizaciones funcionales: dos clics seguidos avanzan dos, aunque aún no se haya vuelto a dibujar
  const anterior = () => setActual((a) => ciclo(a - 1));
  const siguiente = () => setActual((a) => ciclo(a + 1));

  // Si cambian los datos y la posición ya no existe, volver a la primera
  useEffect(() => { if (actual >= total) setActual(0); }, [total]);

  // Avance automático: se reinicia en cada cambio, así la navegación manual da otros 6 s
  const avanza = total > 1 && !pausado && !encima && !conFoco;
  useEffect(() => {
    if (!avanza) return undefined;
    const t = setTimeout(() => setActual((a) => ciclo(a + 1)), INTERVALO_MS);
    return () => clearTimeout(t);
  }, [avanza, actual, ciclo]);

  if (isPending) {
    return <div aria-hidden="true" className={`mb-6 w-full animate-pulse rounded-xl bg-secondary-200 ${ALTO}`} />;
  }
  if (isError || total === 0) return null;

  const varias = total > 1;

  function onKeyDown(e) {
    if (!varias) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); anterior(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); siguiente(); }
  }
  function onTouchStart(e) {
    const t = e.touches[0];
    toque.current = { x: t.clientX, y: t.clientY };
    deslizo.current = false;
  }
  function onTouchEnd(e) {
    if (!toque.current || !varias) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - toque.current.x;
    const dy = t.clientY - toque.current.y;
    toque.current = null;
    // Solo un gesto horizontal claro; uno vertical es desplazar la página
    if (Math.abs(dx) > UMBRAL_DESLIZAR_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      deslizo.current = true;
      if (dx < 0) siguiente(); else anterior();
    }
  }
  const cancelarClicTrasDeslizar = (e) => {
    if (deslizo.current) { e.preventDefault(); deslizo.current = false; }
  };

  return (
    <section
      ref={contenedor}
      aria-roledescription="carrusel"
      aria-label="Propiedades destacadas"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      // Solo el foco del TECLADO pausa: un botón pulsado con el mouse conserva el foco, y si contara,
      // el carrusel quedaría detenido después de usar las flechas o los indicadores
      onFocus={(e) => setConFoco(e.target.matches(':focus-visible'))}
      onBlur={(e) => { if (!contenedor.current?.contains(e.relatedTarget)) setConFoco(false); }}
      className={`relative mb-6 w-full overflow-hidden rounded-xl bg-secondary-800 shadow-sm ${ALTO}`}
    >
      {/* Con el avance automático en marcha no se anuncia cada cambio; en pausa, sí */}
      <div
        aria-live={avanza ? 'off' : 'polite'}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${actual * 100}%)` }}
      >
        {propiedades.map((p, i) => (
          <Diapositiva key={p.id} p={p} indice={i} total={total} actual={actual} onClickCapturado={cancelarClicTrasDeslizar} />
        ))}
      </div>

      {varias && (
        <>
          <button type="button" onClick={anterior} aria-label="Propiedad anterior" className={`absolute left-3 top-3 md:top-1/2 md:-translate-y-1/2 ${botonRedondo}`}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <button type="button" onClick={siguiente} aria-label="Propiedad siguiente" className={`absolute right-3 top-3 md:top-1/2 md:-translate-y-1/2 ${botonRedondo}`}>
            <ChevronRight size={22} aria-hidden="true" />
          </button>

          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-3 px-4 sm:bottom-3">
            <button
              type="button"
              onClick={() => setPausado((v) => !v)}
              aria-label={pausado ? 'Reanudar carrusel' : 'Pausar carrusel'}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-secondary-800 shadow hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {pausado ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
            </button>
            <div className="flex items-center gap-1">
              {propiedades.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => ir(i)}
                  aria-label={`Ir a la propiedad ${i + 1} de ${total}`}
                  aria-current={i === actual ? 'true' : undefined}
                  // Área de toque cómoda (24 px) aunque el punto se vea pequeño
                  className="group flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className={[
                    'block rounded-full transition-all motion-reduce:transition-none',
                    i === actual ? 'h-2.5 w-6 bg-white' : 'h-2.5 w-2.5 bg-white/55 group-hover:bg-white/80',
                  ].join(' ')} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
