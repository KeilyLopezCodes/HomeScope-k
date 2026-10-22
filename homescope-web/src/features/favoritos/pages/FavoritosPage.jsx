import { useNavigate } from 'react-router-dom';
import { AlertTriangle, GitCompare, Heart, Trash2 } from 'lucide-react';
import { Button, EmptyState, Spinner, useToast } from '../../../shared/components/ui';
import { PropiedadCard } from '../../propiedades';
import { useAlternarFavorito, useFavoritos } from '../hooks/useFavoritos';
import { MAX_COMPARAR, useComparador } from '../hooks/useComparador';

const ESTADO_NO_DISPONIBLE = {
  pausado:   'Pausada por el vendedor',
  vendido:   'Ya se vendió',
  alquilado: 'Ya se alquiló',
  borrador:  'Ya no está publicada',
};

// Una guardada que dejó de estar publicada: no se abre la ficha, solo se puede quitar
function TarjetaNoDisponible({ f }) {
  const toast = useToast();
  const alternar = useAlternarFavorito();
  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-lg border border-dashed border-secondary-300 bg-secondary-50 p-4">
      <div>
        <p className="font-medium text-secondary-700 break-words">{f.titulo}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-secondary-500">
          <AlertTriangle size={14} aria-hidden="true" /> {ESTADO_NO_DISPONIBLE[f.estado] ?? 'Ya no está disponible'}
        </p>
      </div>
      <Button
        size="sm" variant="secondary" disabled={alternar.isPending}
        onClick={() => alternar.mutate({ propiedadId: f.id, guardar: false }, {
          onSuccess: () => toast('Quitada de favoritos', 'success', 2500),
          onError:   (err) => toast(err.message ?? 'No se pudo quitar', 'error'),
        })}
      >
        <Trash2 size={14} aria-hidden="true" /> Quitar de favoritos
      </Button>
    </div>
  );
}

export default function FavoritosPage() {
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useFavoritos();
  const comparador = useComparador();

  const disponibles = (data ?? []).filter((f) => f.disponible);
  const noDisponibles = (data ?? []).filter((f) => !f.disponible);
  // La tarjeta del catálogo espera `fotos`; los favoritos traen `portada`
  const comoTarjeta = (f) => ({ ...f, fotos: f.portada ? [{ url: f.portada }] : [] });

  function compararTodas() {
    comparador.reemplazar(disponibles.slice(0, MAX_COMPARAR).map((f) => f.id));
    navigate(`/comparar?ids=${disponibles.slice(0, MAX_COMPARAR).map((f) => f.id).join(',')}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Mis favoritos</h1>
          {data?.length > 0 && (
            <p className="text-sm text-secondary-500">
              {data.length} {data.length === 1 ? 'propiedad guardada' : 'propiedades guardadas'}.
              Usa <GitCompare size={14} className="inline align-text-bottom" aria-label="comparar" /> para elegir hasta {MAX_COMPARAR} y compararlas.
            </p>
          )}
        </div>
        {disponibles.length >= 2 && (
          <Button variant="secondary" onClick={compararTodas}>
            <GitCompare size={16} aria-hidden="true" />
            Comparar {disponibles.length > MAX_COMPARAR ? `las ${MAX_COMPARAR} más recientes` : 'todas'}
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <EmptyState icon={AlertTriangle} title="No se pudieron cargar tus favoritos"
          action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Aún no tienes favoritos"
          description="Toca el corazón en cualquier propiedad del catálogo para guardarla aquí."
          action={<Button onClick={() => navigate('/propiedades')}>Explorar propiedades</Button>}
        />
      ) : (
        <div className="space-y-8">
          {disponibles.length > 0 && (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {disponibles.map((f) => <li key={f.id}><PropiedadCard propiedad={comoTarjeta(f)} /></li>)}
            </ul>
          )}
          {noDisponibles.length > 0 && (
            <section aria-labelledby="titulo-no-disponibles">
              <h2 id="titulo-no-disponibles" className="mb-3 text-base font-semibold text-secondary-700">Ya no disponibles</h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {noDisponibles.map((f) => <li key={f.id}><TarjetaNoDisponible f={f} /></li>)}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
