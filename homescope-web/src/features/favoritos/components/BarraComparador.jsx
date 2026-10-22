import { useLocation, useNavigate } from 'react-router-dom';
import { GitCompare, X } from 'lucide-react';
import { Button } from '../../../shared/components/ui';
import { MAX_COMPARAR, useComparador } from '../hooks/useComparador';

// Barra fija abajo mientras haya propiedades elegidas para comparar (no en la propia página del comparador)
export default function BarraComparador() {
  const { ids, limpiar } = useComparador();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (!ids.length || pathname.startsWith('/comparar') || pathname.startsWith('/admin')) return null;

  return (
    <>
    {/* Espacio para que la barra no tape el final de la página */}
    <div aria-hidden="true" className="h-16" />
    <div role="region" aria-label="Comparador" className="fixed inset-x-0 bottom-0 z-40 border-t border-secondary-200 bg-white/95 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-secondary-700">
          <GitCompare size={18} className="text-primary-600" aria-hidden="true" />
          <span>
            <span className="font-semibold tabular-nums text-secondary-900">{ids.length}</span> de {MAX_COMPARAR} para comparar
            {ids.length < 2 && <span className="hidden text-secondary-500 sm:inline"> · elige al menos 2</span>}
          </span>
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="text" onClick={limpiar} aria-label="Vaciar el comparador">
            <X size={14} aria-hidden="true" /> <span className="hidden sm:inline">Vaciar</span>
          </Button>
          <Button size="sm" onClick={() => navigate(`/comparar?ids=${ids.join(',')}`)} disabled={ids.length < 2}>
            Comparar
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
