import { Link } from 'react-router-dom';
import { Home, MapPin } from 'lucide-react';
import { Badge } from '../../../shared/components/ui';
import { Semaforo } from '../../indice';

const MODALIDAD = {
  venta:    { etiqueta: 'Venta',    variant: 'primary' },
  alquiler: { etiqueta: 'Alquiler', variant: 'success' },
};

function formatearPrecio(precio, moneda) {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency', currency: moneda, maximumFractionDigits: 0,
  }).format(Number(precio));
}

// Zona, municipio y departamento si existen; si no, la dirección
function ubicacionResumida({ zona, municipio, departamento, direccion }) {
  const partes = [zona, municipio, departamento].filter(Boolean);
  return partes.length ? partes.join(', ') : direccion;
}

export default function PropiedadCard({ propiedad }) {
  const portada   = propiedad.fotos?.[0]?.url;
  const modalidad = MODALIDAD[propiedad.modalidad];

  return (
    <Link
      to={`/propiedades/${propiedad.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-secondary-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary-100">
        {portada ? (
          <img
            src={portada}
            alt={propiedad.titulo}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-secondary-300">
            <Home size={40} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
        {modalidad && (
          <Badge variant={modalidad.variant} className="absolute left-2 top-2 shadow-sm">
            {modalidad.etiqueta}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-lg font-bold text-secondary-900">
          {formatearPrecio(propiedad.precio, propiedad.moneda)}
          {propiedad.modalidad === 'alquiler' && (
            <span className="text-sm font-normal text-secondary-500"> /mes</span>
          )}
        </p>
        <h3 className="line-clamp-1 text-sm font-medium text-secondary-800">{propiedad.titulo}</h3>
        <p className="text-xs capitalize text-secondary-500">{propiedad.tipo_propiedad?.nombre}</p>
        <p className="flex items-start gap-1 text-xs text-secondary-600">
          <MapPin size={14} className="mt-px shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">{ubicacionResumida(propiedad)}</span>
        </p>
        <div className="mt-auto pt-2">
          <Semaforo puntaje={propiedad.indice_conveniencia?.puntaje} />
        </div>
      </div>
    </Link>
  );
}
