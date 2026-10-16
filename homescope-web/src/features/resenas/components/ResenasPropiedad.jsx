import { MessageSquareText } from 'lucide-react';
import { Badge } from '../../../shared/components/ui';

// TODO: listar reseñas del vendedor y comentarios de la zona cuando exista el módulo de reputación
export default function ResenasPropiedad() {
  return (
    <div className="flex items-start gap-3 rounded-md bg-secondary-50 p-3">
      <MessageSquareText size={18} className="mt-0.5 shrink-0 text-secondary-400" aria-hidden="true" />
      <div>
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-secondary-800">
          Reseñas del vendedor y comentarios de la zona <Badge variant="warning">Próximamente</Badge>
        </p>
        <p className="text-xs text-secondary-500">
          Aquí podrás leer las opiniones de otros compradores sobre el vendedor y la zona.
        </p>
      </div>
    </div>
  );
}
