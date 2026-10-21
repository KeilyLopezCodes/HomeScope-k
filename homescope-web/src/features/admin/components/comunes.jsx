import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../../../shared/components/ui';

export const MOTIVOS = {
  spam:              'Spam',
  ofensivo:          'Ofensivo',
  informacion_falsa: 'Información falsa',
  datos_personales:  'Datos personales',
  fraude:            'Fraude',
  otro:              'Otro',
};

export const ESTADOS_PROPIEDAD = {
  borrador:  { etiqueta: 'Borrador',  variant: 'default' },
  publicado: { etiqueta: 'Publicada', variant: 'success' },
  pausado:   { etiqueta: 'Pausada',   variant: 'warning' },
  vendido:   { etiqueta: 'Vendida',   variant: 'primary' },
  alquilado: { etiqueta: 'Alquilada', variant: 'primary' },
};

export const ESTADOS_CUENTA = {
  activo:       { etiqueta: 'Activa',       variant: 'success' },
  pendiente:    { etiqueta: 'Sin verificar', variant: 'default' },
  suspendido:   { etiqueta: 'Suspendida',   variant: 'danger' },
  inhabilitado: { etiqueta: 'Inhabilitada', variant: 'danger' },
};

export const ACCIONES = {
  aprobar:            'Aprobada',
  pausar:             'Pausada',
  eliminar:           'Eliminada',
  suspender:          'Suspendida',
  reactivar:          'Reactivada',
  ocultar_comentario: 'Comentario ocultado',
  descartar_reporte:  'Reporte descartado',
};

const formatoFecha = new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
const formatoFechaHora = new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const fecha = (f) => (f ? formatoFecha.format(new Date(f)) : '—');
export const fechaHora = (f) => (f ? formatoFechaHora.format(new Date(f)) : '—');
export const numero = (n) => new Intl.NumberFormat('es-GT').format(n ?? 0);

export function BadgeEstado({ estados, estado }) {
  const e = estados[estado] ?? { etiqueta: estado, variant: 'default' };
  return <Badge variant={e.variant} className="whitespace-nowrap">{e.etiqueta}</Badge>;
}

// Motivos con su cantidad: "Información falsa ×2"
export function ChipsMotivos({ motivos }) {
  if (!motivos?.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Motivos de los reportes">
      {motivos.map((m) => (
        <li key={m.motivo} className="rounded-full border border-secondary-200 bg-secondary-50 px-2 py-0.5 text-xs text-secondary-700">
          {MOTIVOS[m.motivo] ?? m.motivo}{m.cantidad > 1 && <span className="font-semibold"> ×{m.cantidad}</span>}
        </li>
      ))}
    </ul>
  );
}

// Reportes abiertos, plegables
export function ListaReportes({ reportes }) {
  const [abierta, setAbierta] = useState(false);
  if (!reportes?.length) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
      >
        {abierta ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        {abierta ? 'Ocultar' : 'Ver'} {reportes.length === 1 ? 'el reporte' : `los ${reportes.length} reportes`}
      </button>
      {abierta && (
        <ul className="mt-2 space-y-2">
          {reportes.map((r) => (
            <li key={r.id} className="rounded border border-secondary-200 bg-secondary-50 p-2 text-sm">
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-secondary-500">
                <span className="font-medium text-secondary-800">{MOTIVOS[r.motivo] ?? r.motivo}</span>
                <span>· {r.reportante?.nombre ?? 'Usuario'}</span>
                <span>· {fechaHora(r.fecha_creacion)}</span>
                <span>· #{r.id}</span>
              </p>
              {r.descripcion && <p className="mt-1 text-secondary-700 break-words">{r.descripcion}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Pestañas secundarias (filtros) con el estado en la URL
export function Filtros({ opciones, valor, onCambiar, etiqueta }) {
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex flex-wrap gap-1 rounded border border-secondary-200 bg-white p-0.5">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={o.valor === valor}
          onClick={() => onCambiar(o.valor)}
          className={[
            'rounded px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            o.valor === valor ? 'bg-primary-600 text-white' : 'text-secondary-600 hover:bg-secondary-100',
          ].join(' ')}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
