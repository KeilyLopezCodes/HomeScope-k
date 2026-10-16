import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { CENTRO_GUATEMALA, MAP_ID, aLiteral } from '../services/googleMaps';

const VISTAS = [
  { id: 'mapa',     etiqueta: 'Mapa' },
  { id: 'satelite', etiqueta: 'Satélite' },
  { id: 'street',   etiqueta: 'Street View' },
];

const mismaPosicion = (a, b) =>
  a && b && Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;

// posicion: { lat, lng } o null. Con `arrastrable`, el marcador se mueve arrastrándolo
// o haciendo clic en el mapa, y cada cambio se informa con onMover({ lat, lng }).
export default function MapaInteractivo({ posicion, arrastrable = false, onMover, titulo = 'Ubicación' }) {
  const { maps, error } = useGoogleMaps();
  const divMapa   = useRef(null);
  const divStreet = useRef(null);
  const mapa      = useRef(null);
  const marcador  = useRef(null);
  const panorama  = useRef(null);
  const onMoverRef = useRef(onMover);
  onMoverRef.current = onMover;

  const [vista, setVista] = useState('mapa');
  // null: sin consultar · true/false: si hay panorama de Street View cerca del marcador
  const [hayStreetView, setHayStreetView] = useState(null);

  // Crear el mapa y el marcador una sola vez, cuando la API termina de cargar
  useEffect(() => {
    if (!maps || mapa.current) return;
    const { Map, AdvancedMarkerElement } = maps;

    mapa.current = new Map(divMapa.current, {
      center: posicion ?? CENTRO_GUATEMALA,
      zoom: posicion ? 17 : 7,
      mapId: MAP_ID,
      mapTypeControl: false,
      streetViewControl: false,
      gestureHandling: 'cooperative',
    });
    marcador.current = new AdvancedMarkerElement({
      map: mapa.current,
      position: posicion,
      title: titulo,
      gmpDraggable: arrastrable,
    });

    if (arrastrable) {
      const mover = (latLng) => {
        const nueva = aLiteral(latLng);
        marcador.current.position = nueva;
        onMoverRef.current?.(nueva);
      };
      marcador.current.addListener('dragend', () => mover(marcador.current.position));
      mapa.current.addListener('click', (e) => mover(e.latLng));
    }
  }, [maps]);

  // Cambios de posición desde fuera (campos del formulario, geocodificación): mover marcador y centrar
  useEffect(() => {
    if (!marcador.current) return;
    setHayStreetView(null);
    if (!posicion) { marcador.current.position = null; return; }
    if (mismaPosicion(aLiteral(marcador.current.position), posicion)) return;
    marcador.current.position = posicion;
    mapa.current.panTo(posicion);
    if (mapa.current.getZoom() < 15) mapa.current.setZoom(17);
  }, [maps, posicion?.lat, posicion?.lng]);

  // Mapa / satélite / Street View
  useEffect(() => {
    if (!mapa.current) return;
    if (vista !== 'street') {
      mapa.current.setMapTypeId(vista === 'satelite' ? 'hybrid' : 'roadmap');
      return;
    }
    if (!posicion) return;

    let activo = true;
    new maps.StreetViewService()
      .getPanorama({ location: posicion, radius: 100 })
      .then(({ data }) => {
        if (!activo) return;
        setHayStreetView(true);
        panorama.current ??= new maps.StreetViewPanorama(divStreet.current, {
          pov: { heading: 0, pitch: 0 },
          addressControl: false,
          motionTracking: false,
        });
        panorama.current.setPosition(data.location.latLng);
      })
      .catch(() => activo && setHayStreetView(false));
    return () => { activo = false; };
  }, [maps, vista, posicion?.lat, posicion?.lng]);

  if (error) {
    return (
      <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-md bg-secondary-100 p-4 text-center text-secondary-500">
        <AlertCircle size={28} strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  const enStreet = vista === 'street';

  return (
    <div>
      <div role="tablist" aria-label="Vista del mapa" className="mb-2 inline-flex rounded-md bg-secondary-100 p-0.5">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={vista === v.id}
            disabled={v.id === 'street' && !posicion}
            title={v.id === 'street' && !posicion ? 'Primero ubica la propiedad en el mapa' : undefined}
            onClick={() => setVista(v.id)}
            className={[
              'rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              vista === v.id ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-600 hover:text-secondary-900',
            ].join(' ')}
          >
            {v.etiqueta}
          </button>
        ))}
      </div>

      <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-secondary-100">
        {/* Los dos contenedores quedan montados: el mapa no se recrea al volver de Street View */}
        <div ref={divMapa} aria-label={`Mapa de ${titulo}`} className={['h-full w-full', enStreet ? 'hidden' : ''].join(' ')} />
        <div ref={divStreet} aria-label={`Street View de ${titulo}`} className={['h-full w-full', enStreet && hayStreetView ? '' : 'hidden'].join(' ')} />

        {!maps && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-primary-600" aria-label="Cargando mapa" />
          </div>
        )}
        {enStreet && hayStreetView === false && (
          <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-secondary-600">
            No hay imágenes de Street View a menos de 100 m de esta ubicación.
          </p>
        )}
      </div>
    </div>
  );
}
