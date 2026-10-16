import { useState } from 'react';
import { Info, LocateFixed } from 'lucide-react';
import { Button } from '../../../shared/components/ui';
import MapaInteractivo from './MapaInteractivo';
import { HAY_CLAVE, direccionDesdePosicion, posicionDesdeDireccion } from '../services/googleMaps';

const MENSAJES = {
  buscando:      { texto: 'Buscando la dirección…',                                         clase: 'text-secondary-500' },
  actualizada:   { texto: 'Dirección actualizada desde el mapa. Revísala antes de continuar.', clase: 'text-success-700' },
  sinDireccion:  { texto: 'No encontramos una dirección para ese punto; escríbela a mano.',  clase: 'text-warning-700' },
  ubicada:       { texto: 'Ubicamos la dirección en el mapa. Arrastra el marcador para ajustarla.', clase: 'text-success-700' },
  noEncontrada:  { texto: 'No encontramos esa dirección. Marca el punto directamente en el mapa.', clase: 'text-warning-700' },
};

// posicion: { lat, lng } o null
// onPosicion({ lat, lng }): el usuario movió el marcador o se ubicó la dirección escrita
// onDireccion({ direccion, zona, municipio, departamento }): resultado de la geocodificación inversa
// direccionEscrita: texto armado con los campos del formulario, para ubicarlo en el mapa
export default function SelectorUbicacion({ posicion, onPosicion, onDireccion, direccionEscrita }) {
  const [estado, setEstado] = useState(null);

  if (!HAY_CLAVE) {
    return (
      <p className="flex items-start gap-2 rounded-md bg-secondary-50 p-3 text-xs text-secondary-600">
        <Info size={16} className="mt-px shrink-0" aria-hidden="true" />
        El mapa no está disponible porque falta configurar VITE_GOOGLE_MAPS_BROWSER_KEY.
        Puedes escribir la latitud y la longitud manualmente.
      </p>
    );
  }

  async function alMover(nueva) {
    onPosicion(nueva);
    setEstado('buscando');
    const datos = await direccionDesdePosicion(nueva).catch(() => null);
    if (datos) onDireccion(datos);
    setEstado(datos ? 'actualizada' : 'sinDireccion');
  }

  async function ubicarDireccion() {
    setEstado('buscando');
    const encontrada = await posicionDesdeDireccion(direccionEscrita).catch(() => null);
    if (encontrada) onPosicion(encontrada);
    setEstado(encontrada ? 'ubicada' : 'noEncontrada');
  }

  const mensaje = MENSAJES[estado];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-secondary-700">Ubicación exacta</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={ubicarDireccion}
          disabled={!direccionEscrita || estado === 'buscando'}
        >
          <LocateFixed size={14} aria-hidden="true" /> Ubicar dirección en el mapa
        </Button>
      </div>
      <p className="text-xs text-secondary-500">
        Arrastra el marcador o haz clic en el mapa para fijar el punto exacto; la dirección se completa sola.
      </p>
      <MapaInteractivo posicion={posicion} arrastrable onMover={alMover} titulo="la propiedad" />
      {mensaje && <p role="status" className={['text-xs', mensaje.clase].join(' ')}>{mensaje.texto}</p>}
    </div>
  );
}
