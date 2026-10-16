import { useEffect, useState } from 'react';
import { ExternalLink, MapPinOff } from 'lucide-react';
import MapaInteractivo from './MapaInteractivo';
import { HAY_CLAVE, posicionDesdeDireccion } from '../services/googleMaps';

const VISTAS = [
  { id: 'mapa',     etiqueta: 'Mapa' },
  { id: 'satelite', etiqueta: 'Satélite' },
  { id: 'street',   etiqueta: 'Street View' },
];

// Respaldo sin clave de Google: el embed público no necesita API key
function urlEmbed(vista, { lat, lng, consulta }) {
  const lugar = encodeURIComponent(lat != null ? `${lat},${lng}` : consulta);
  return `https://maps.google.com/maps?q=${lugar}&t=${vista === 'satelite' ? 'k' : 'm'}&z=16&output=embed`;
}

// Street View sin clave no se puede incrustar: se abre en Google Maps
const urlStreetViewExterna = (lat, lng) =>
  `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;

function SinUbicacion() {
  return (
    <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-md bg-secondary-100 text-secondary-400">
      <MapPinOff size={32} strokeWidth={1.5} aria-hidden="true" />
      <p className="text-sm">Ubicación no disponible</p>
    </div>
  );
}

// Con clave: mapa interactivo de la Maps JavaScript API. Si la propiedad no tiene coordenadas,
// se ubica geocodificando la dirección.
function MapaConClave({ lat, lng, direccion, titulo }) {
  const tieneCoordenadas = lat != null && lng != null;
  const [posicion, setPosicion] = useState(tieneCoordenadas ? { lat, lng } : null);
  const [buscando, setBuscando] = useState(!tieneCoordenadas && Boolean(direccion));

  useEffect(() => {
    if (tieneCoordenadas) { setPosicion({ lat, lng }); return; }
    if (!direccion) return;
    let activo = true;
    posicionDesdeDireccion(`${direccion}, Guatemala`)
      .then((p) => activo && setPosicion(p))
      .catch(() => {})
      .finally(() => activo && setBuscando(false));
    return () => { activo = false; };
  }, [lat, lng, direccion, tieneCoordenadas]);

  if (!buscando && !posicion) return <SinUbicacion />;
  return <MapaInteractivo posicion={posicion} titulo={titulo} />;
}

export default function MapaPropiedad({ latitud, longitud, direccion, titulo }) {
  const lat = latitud != null ? Number(latitud) : null;
  const lng = longitud != null ? Number(longitud) : null;

  if ((lat == null || lng == null) && !direccion) return <SinUbicacion />;
  if (HAY_CLAVE) return <MapaConClave lat={lat} lng={lng} direccion={direccion} titulo={titulo} />;
  return <MapaEmbebido lat={lat} lng={lng} direccion={direccion} titulo={titulo} />;
}

function MapaEmbebido({ lat, lng, direccion, titulo }) {
  const [vista, setVista] = useState('mapa');
  const tieneCoordenadas = lat != null && lng != null;

  // Street View necesita coordenadas exactas
  const vistas = tieneCoordenadas ? VISTAS : VISTAS.filter((v) => v.id !== 'street');
  const streetExterno = vista === 'street';

  return (
    <div>
      <div role="tablist" aria-label="Vista del mapa" className="mb-2 inline-flex rounded-md bg-secondary-100 p-0.5">
        {vistas.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={vista === v.id}
            onClick={() => setVista(v.id)}
            className={[
              'rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              vista === v.id ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-600 hover:text-secondary-900',
            ].join(' ')}
          >
            {v.etiqueta}
          </button>
        ))}
      </div>

      <div className="aspect-[16/9] overflow-hidden rounded-md bg-secondary-100">
        {streetExterno ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <p className="text-sm text-secondary-600">Street View se abre en Google Maps.</p>
            <a
              href={urlStreetViewExterna(lat, lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
            >
              Ver Street View <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        ) : (
          <iframe
            key={vista}
            title={`${VISTAS.find((v) => v.id === vista).etiqueta} de ${titulo}`}
            src={urlEmbed(vista, { lat, lng, consulta: direccion })}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="h-full w-full border-0"
          />
        )}
      </div>
    </div>
  );
}
