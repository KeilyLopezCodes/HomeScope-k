import { useState } from 'react';
import { ExternalLink, MapPinOff } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
// El .env.example trae un valor de ejemplo: sin una clave real se usa el embed público de Google Maps
const HAY_CLAVE = Boolean(API_KEY) && API_KEY !== 'your_browser_key';

const VISTAS = [
  { id: 'mapa',     etiqueta: 'Mapa' },
  { id: 'satelite', etiqueta: 'Satélite' },
  { id: 'street',   etiqueta: 'Street View' },
];

function urlEmbed(vista, { lat, lng, consulta }) {
  const lugar = encodeURIComponent(lat != null ? `${lat},${lng}` : consulta);
  if (HAY_CLAVE) {
    const base = 'https://www.google.com/maps/embed/v1';
    if (vista === 'street') return `${base}/streetview?key=${API_KEY}&location=${lat},${lng}`;
    const tipo = vista === 'satelite' ? 'satellite' : 'roadmap';
    return `${base}/place?key=${API_KEY}&q=${lugar}&zoom=16&maptype=${tipo}`;
  }
  return `https://maps.google.com/maps?q=${lugar}&t=${vista === 'satelite' ? 'k' : 'm'}&z=16&output=embed`;
}

// Street View sin clave no se puede incrustar: se abre en Google Maps
const urlStreetViewExterna = (lat, lng) =>
  `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;

export default function MapaPropiedad({ latitud, longitud, direccion, titulo }) {
  const [vista, setVista] = useState('mapa');
  const lat = latitud != null ? Number(latitud) : null;
  const lng = longitud != null ? Number(longitud) : null;
  const tieneCoordenadas = lat != null && lng != null;

  if (!tieneCoordenadas && !direccion) {
    return (
      <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-md bg-secondary-100 text-secondary-400">
        <MapPinOff size={32} strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm">Ubicación no disponible</p>
      </div>
    );
  }

  // Street View necesita coordenadas exactas
  const vistas = tieneCoordenadas ? VISTAS : VISTAS.filter((v) => v.id !== 'street');
  const streetExterno = vista === 'street' && !HAY_CLAVE;

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
