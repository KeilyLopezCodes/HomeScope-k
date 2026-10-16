import { BadgeCheck, Lock, Star } from 'lucide-react';
import { Badge } from '../../../shared/components/ui';

function Calificacion({ promedio, total }) {
  if (promedio == null) return <p className="text-xs text-secondary-500">Sin calificaciones aún</p>;
  return (
    <p className="flex items-center gap-1 text-xs text-secondary-600">
      <Star size={14} className="fill-warning-500 text-warning-500" aria-hidden="true" />
      <span className="font-medium text-secondary-800">{Number(promedio).toFixed(1)}</span>
      <span>({total} {total === 1 ? 'reseña' : 'reseñas'})</span>
    </p>
  );
}

// RNF-08: este bloque nunca muestra teléfono ni correo, aunque la API los incluya
export default function VendedorCard({ vendedor }) {
  const nombre    = [vendedor.nombre, vendedor.apellido].filter(Boolean).join(' ');
  const iniciales = [vendedor.nombre, vendedor.apellido].map((p) => p?.[0] ?? '').join('').toUpperCase();

  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-secondary-500">Vendedor</p>
      <div className="flex items-center gap-3">
        {vendedor.foto_url ? (
          <img src={vendedor.foto_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
            {iniciales}
          </span>
        )}
        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-medium text-secondary-900">{nombre}</p>
          {vendedor.verificado && (
            <Badge variant="verificado"><BadgeCheck size={12} aria-hidden="true" /> Vendedor verificado</Badge>
          )}
          <Calificacion promedio={vendedor.calificacion_promedio} total={vendedor.total_resenas ?? 0} />
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-secondary-500">
        <Lock size={12} aria-hidden="true" /> Contacto oculto hasta iniciar una conversación
      </p>
    </div>
  );
}
