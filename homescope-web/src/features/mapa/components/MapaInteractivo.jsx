import { createElement, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { CENTRO_GUATEMALA, MAP_ID, aLiteral } from '../services/googleMaps';

const VISTAS = [
  { id: 'mapa',     etiqueta: 'Mapa' },
  { id: 'satelite', etiqueta: 'Satélite' },
  { id: 'street',   etiqueta: 'Street View' },
];

// Distancia máxima entre la propiedad y el panorama más cercano (las casas suelen estar retiradas de la calle)
const RADIO_STREET_VIEW = 150;

// Círculo de color con el icono de la categoría, como contenido de un AdvancedMarkerElement
function crearIconoPunto({ color, Icono, titulo }) {
  const elemento = document.createElement('div');
  elemento.setAttribute('aria-label', titulo);
  Object.assign(elemento.style, {
    width: '28px', height: '28px', borderRadius: '9999px', background: color, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.35)', cursor: 'pointer',
  });
  const root = createRoot(elemento);
  root.render(createElement(Icono, { size: 15, strokeWidth: 2.25, 'aria-hidden': true }));
  return { elemento, root };
}

// Contenido de la ventana de información, con textContent: los nombres vienen de Google
function contenidoInfo({ titulo, detalle }) {
  const caja = document.createElement('div');
  caja.style.cssText = 'font: 13px system-ui, sans-serif; max-width: 220px';
  const nombre = document.createElement('p');
  nombre.style.cssText = 'font-weight: 600; margin: 0 0 2px';
  nombre.textContent = titulo;
  const linea = document.createElement('p');
  linea.style.cssText = 'margin: 0; color: #4b5563';
  linea.textContent = detalle ?? '';
  caja.append(nombre, linea);
  return caja;
}

const mismaPosicion = (a, b) =>
  a && b && Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;

// posicion: { lat, lng } o null. Con `arrastrable`, el marcador se mueve arrastrándolo
// o haciendo clic en el mapa, y cada cambio se informa con onMover({ lat, lng }).
// marcadores: puntos adicionales [{ id, lat, lng, titulo, detalle, color, Icono }] (p. ej. puntos de interés)
// radio: en metros; dibuja el círculo de búsqueda alrededor de `posicion` y ajusta el zoom para verlo completo
export default function MapaInteractivo({
  posicion, arrastrable = false, onMover, titulo = 'Ubicación', marcadores = [], radio = null,
}) {
  const { maps, error } = useGoogleMaps();
  const divMapa   = useRef(null);
  const divStreet = useRef(null);
  const mapa      = useRef(null);
  const marcador  = useRef(null);
  const panorama  = useRef(null);
  const marcadorStreet = useRef(null);
  const infoWindow = useRef(null);
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
      zIndex: 1000, // la propiedad siempre por encima de los puntos de interés
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

  // Marcadores adicionales: se reemplazan completos cada vez que cambia la lista
  useEffect(() => {
    if (!maps || !mapa.current || !marcadores.length) return;
    infoWindow.current ??= new maps.InfoWindow();

    const creados = marcadores.map((m) => {
      const { elemento, root } = crearIconoPunto(m);
      const marker = new maps.AdvancedMarkerElement({
        map: mapa.current,
        position: { lat: m.lat, lng: m.lng },
        title: m.titulo,
        content: elemento,
      });
      marker.addListener('click', () => {
        infoWindow.current.setContent(contenidoInfo(m));
        infoWindow.current.open({ map: mapa.current, anchor: marker });
      });
      return { marker, root };
    });

    return () => {
      infoWindow.current?.close();
      creados.forEach(({ marker }) => { marker.map = null; });
      // Desmontar fuera del commit de React para evitar el aviso de "unmount durante el render"
      setTimeout(() => creados.forEach(({ root }) => root.unmount()));
    };
  }, [maps, marcadores]);

  // Círculo del radio de búsqueda
  useEffect(() => {
    if (!maps || !mapa.current || !radio || !posicion) return;
    const circulo = new maps.Circle({
      map: mapa.current,
      center: posicion,
      radius: radio,
      strokeColor: '#2563eb',
      strokeOpacity: 0.6,
      strokeWeight: 1.5,
      fillColor: '#2563eb',
      fillOpacity: 0.05,
      clickable: false,
    });
    mapa.current.fitBounds(circulo.getBounds(), 8);
    return () => circulo.setMap(null);
  }, [maps, radio, posicion?.lat, posicion?.lng]);

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
      .getPanorama({ location: posicion, radius: RADIO_STREET_VIEW, sources: [maps.StreetViewSource.OUTDOOR] })
      .then(({ data }) => {
        if (!activo) return;
        const desde = data.location.latLng;
        panorama.current ??= new maps.StreetViewPanorama(divStreet.current, {
          addressControl: false,
          motionTracking: false,
          fullscreenControl: true,
        });
        // La cámara mira hacia la propiedad, que puede estar a unos metros de la calle
        panorama.current.setPosition(desde);
        panorama.current.setPov({ heading: maps.spherical.computeHeading(desde, posicion), pitch: 0 });
        panorama.current.setVisible(true);

        // AdvancedMarkerElement no se dibuja dentro de Street View: aquí se usa el marcador clásico
        marcadorStreet.current ??= new maps.Marker({ map: panorama.current, title: titulo });
        marcadorStreet.current.setPosition(posicion);
        setHayStreetView(true);
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
        {/* Los dos contenedores quedan montados y superpuestos: el mapa no se recrea al volver de Street View.
            Se ocultan con `invisible` y no con `hidden`: Google no dibuja un panorama creado en un div con display:none */}
        <div ref={divMapa} aria-label={`Mapa de ${titulo}`} className={['absolute inset-0', enStreet ? 'invisible' : ''].join(' ')} />
        <div ref={divStreet} aria-label={`Street View de ${titulo}`} className={['absolute inset-0', enStreet && hayStreetView ? '' : 'invisible'].join(' ')} />

        {!maps && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-primary-600" aria-label="Cargando mapa" />
          </div>
        )}
        {enStreet && hayStreetView === null && maps && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-primary-600" aria-label="Buscando Street View" />
          </div>
        )}
        {enStreet && hayStreetView === false && (
          <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-secondary-600">
            Google no tiene imágenes de Street View a menos de {RADIO_STREET_VIEW} m de esta ubicación.
          </p>
        )}
      </div>
    </div>
  );
}
