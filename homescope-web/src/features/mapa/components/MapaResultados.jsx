import { createElement, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { MAP_ID, aLiteral } from '../services/googleMaps';
import TarjetaMapa from './TarjetaMapa';

// Espera tras el último movimiento antes de pedir resultados (evita una consulta por cada cuadro del arrastre)
const ESPERA_MS = 300;

// "Q 450 mil", "US$33 mil": el precio cabe en el marcador
const precioCorto = (p) => new Intl.NumberFormat('es-GT', {
  style: 'currency', currency: p.moneda, notation: 'compact', maximumFractionDigits: 1,
}).format(Number(p.precio));

function estiloMarcador(elemento, { seleccionado, resaltado }) {
  const activo = seleccionado || resaltado;
  Object.assign(elemento.style, {
    background: activo ? '#1e3a8a' : '#2563eb', // primary-900 / primary-600
    transform:  activo ? 'scale(1.12)' : 'scale(1)',
    boxShadow:  activo ? '0 0 0 3px #fff, 0 2px 8px rgba(0,0,0,.45)' : '0 1px 4px rgba(0,0,0,.35)',
  });
}

// Mapa de resultados: un marcador con el precio por propiedad. Cada vez que el mapa queda quieto
// (después de moverlo o hacer zoom) informa el área visible con onArea({ bbox, centro, zoom }).
//   bbox: [oeste, sur, este, norte]; seleccionada: id con la tarjeta abierta; resaltada: id bajo el cursor en la lista
export default function MapaResultados({
  propiedades, vistaInicial, onArea, seleccionada, onSeleccionar, resaltada, onVerFicha,
}) {
  const { maps, error } = useGoogleMaps();
  const divMapa = useRef(null);
  const mapa = useRef(null);
  const info = useRef(null);
  const marcadores = useRef(new Map()); // id → { marker, elemento, propiedad }
  const callbacks = useRef({});
  callbacks.current = { onArea, onSeleccionar, onVerFicha };

  // Crear el mapa una sola vez
  useEffect(() => {
    if (!maps || mapa.current) return undefined;
    mapa.current = new maps.Map(divMapa.current, {
      center: vistaInicial.centro,
      zoom: vistaInicial.zoom,
      mapId: MAP_ID,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: 'greedy',
    });
    info.current = new maps.InfoWindow({ maxWidth: 280 });
    info.current.addListener('closeclick', () => callbacks.current.onSeleccionar(null));
    mapa.current.addListener('click', () => callbacks.current.onSeleccionar(null));

    let espera;
    mapa.current.addListener('idle', () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        const limites = mapa.current.getBounds();
        if (!limites) return;
        const ne = limites.getNorthEast();
        const so = limites.getSouthWest();
        const redondear = (n) => Math.round(n * 1e5) / 1e5;
        callbacks.current.onArea({
          bbox:   [so.lng(), so.lat(), ne.lng(), ne.lat()].map(redondear),
          centro: aLiteral(mapa.current.getCenter()),
          zoom:   mapa.current.getZoom(),
        });
      }, ESPERA_MS);
    });
    return () => clearTimeout(espera);
  }, [maps]);

  // Marcadores: se agregan los nuevos y se quitan los que ya no están en los resultados
  useEffect(() => {
    if (!maps || !mapa.current) return;
    const actuales = marcadores.current;
    const ids = new Set(propiedades.map((p) => p.id));
    for (const [id, m] of actuales) {
      if (!ids.has(id)) { m.marker.map = null; actuales.delete(id); }
    }
    for (const p of propiedades) {
      if (p.latitud == null || p.longitud == null) continue;
      const existente = actuales.get(p.id);
      if (existente) { existente.propiedad = p; continue; }
      const elemento = document.createElement('div');
      elemento.textContent = precioCorto(p);
      Object.assign(elemento.style, {
        color: '#fff', font: '600 12px system-ui, sans-serif', padding: '4px 8px', borderRadius: '9999px',
        border: '2px solid #fff', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'transform .12s',
      });
      estiloMarcador(elemento, {});
      const marker = new maps.AdvancedMarkerElement({
        map: mapa.current,
        position: { lat: Number(p.latitud), lng: Number(p.longitud) },
        content: elemento,
        title: `${p.titulo} · ${precioCorto(p)}`,
      });
      marker.addListener('click', () => callbacks.current.onSeleccionar(p.id));
      actuales.set(p.id, { marker, elemento, propiedad: p });
    }
  }, [maps, propiedades]);

  // Seleccionada o resaltada: se destaca y queda por encima de las demás
  useEffect(() => {
    for (const [id, { marker, elemento }] of marcadores.current) {
      const estado = { seleccionado: id === seleccionada, resaltado: id === resaltada };
      estiloMarcador(elemento, estado);
      marker.zIndex = estado.seleccionado ? 2000 : estado.resaltado ? 1000 : null;
    }
  }, [seleccionada, resaltada, propiedades]);

  // Tarjeta resumen de la seleccionada
  useEffect(() => {
    if (!info.current) return undefined;
    const m = marcadores.current.get(seleccionada);
    if (!m) { info.current.close(); return undefined; }
    const contenido = document.createElement('div');
    const root = createRoot(contenido);
    root.render(createElement(TarjetaMapa, { propiedad: m.propiedad, onVerFicha: (id) => callbacks.current.onVerFicha(id) }));
    info.current.setContent(contenido);
    info.current.open({ map: mapa.current, anchor: m.marker, shouldFocus: false });
    return () => setTimeout(() => root.unmount());
  }, [seleccionada, propiedades, maps]);

  // Al salir de la página
  useEffect(() => () => {
    marcadores.current.forEach(({ marker }) => { marker.map = null; });
    marcadores.current.clear();
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-secondary-200 bg-secondary-100">
      <div ref={divMapa} className="h-full w-full" role="region" aria-label="Mapa de resultados" />
      {!maps && !error && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-secondary-500">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Cargando mapa…
        </div>
      )}
      {error && (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-secondary-600">
          <AlertCircle size={24} className="text-danger-600" aria-hidden="true" />
          No se pudo cargar Google Maps. {error.message}
        </div>
      )}
    </div>
  );
}
