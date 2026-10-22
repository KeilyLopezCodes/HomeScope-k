import { useLocation, useNavigate } from 'react-router-dom';
import { Check, GitCompare, Heart } from 'lucide-react';
import { useToast } from '../../../shared/components/ui';
import { useAuth } from '../../auth';
import { useAlternarFavorito, useFavoritos } from '../hooks/useFavoritos';
import { MAX_COMPARAR, useComparador } from '../hooks/useComparador';

const estiloRedondo = 'flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-secondary-700 shadow-sm ring-1 ring-black/5 '
  + 'hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60';

// Corazón para guardar o quitar de favoritos. Sin sesión lleva a iniciar sesión (y regresa aquí)
export function BotonFavoritoTarjeta({ propiedad }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const toast = useToast();
  const { ids } = useFavoritos();
  const alternar = useAlternarFavorito();

  if (user && propiedad.vendedor?.id === user.id) return null; // la propia no se guarda
  const guardada = ids.has(propiedad.id);

  function onClick() {
    if (!user) return navigate('/login', { state: { from: pathname + search } });
    alternar.mutate({ propiedadId: propiedad.id, guardar: !guardada, propiedad }, {
      onSuccess: () => toast(guardada ? 'Quitada de favoritos' : 'Guardada en favoritos', 'success', 2500),
      onError:   (err) => toast(err.message ?? 'No se pudo actualizar favoritos', 'error'),
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={alternar.isPending}
      aria-pressed={guardada}
      aria-label={guardada ? `Quitar "${propiedad.titulo}" de favoritos` : `Guardar "${propiedad.titulo}" en favoritos`}
      title={guardada ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      className={estiloRedondo}
    >
      <Heart size={18} aria-hidden="true" className={guardada ? 'fill-danger-600 text-danger-600' : ''} />
    </button>
  );
}

// Agregar o quitar del comparador (hasta 4)
export function BotonComparar({ propiedad, variante = 'icono' }) {
  const toast = useToast();
  const comparador = useComparador();
  const incluida = comparador.incluye(propiedad.id);

  function onClick() {
    if (incluida) return comparador.quitar(propiedad.id);
    if (!comparador.agregar(propiedad.id))
      toast(`Puedes comparar hasta ${MAX_COMPARAR} propiedades. Quita una para agregar otra.`, 'info');
  }

  const etiqueta = incluida ? `Quitar "${propiedad.titulo}" del comparador` : `Agregar "${propiedad.titulo}" al comparador`;
  if (variante === 'texto') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={incluida}
        aria-label={etiqueta}
        className={[
          'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          incluida ? 'bg-primary-100 text-primary-700' : 'bg-secondary-100 text-secondary-800 hover:bg-secondary-200',
        ].join(' ')}
      >
        {incluida ? <Check size={14} aria-hidden="true" /> : <GitCompare size={14} aria-hidden="true" />}
        {incluida ? 'En el comparador' : 'Comparar'}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={incluida}
      aria-label={etiqueta}
      title={incluida ? 'Quitar del comparador' : 'Agregar al comparador'}
      className={[estiloRedondo, incluida ? '!bg-primary-600 !text-white' : ''].join(' ')}
    >
      {incluida ? <Check size={18} aria-hidden="true" /> : <GitCompare size={18} aria-hidden="true" />}
    </button>
  );
}
