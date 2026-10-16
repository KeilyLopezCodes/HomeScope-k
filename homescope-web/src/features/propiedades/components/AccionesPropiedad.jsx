import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Flag, Heart, MessageCircle, Pencil, Share2 } from 'lucide-react';
import { Badge, Button, useToast } from '../../../shared/components/ui';
import { useAuth } from '../../auth';
import { useToggleFavorito } from '../../favoritos';

// Lleva a iniciar sesión; LoginPage regresa a `from` (esta misma ficha) al autenticarse
function useIrALogin() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return () => navigate('/login', { state: { from: pathname } });
}

// variante "icono": botón compacto para la barra superior en móvil
export function BotonFavorito({ propiedad, queryKey, variante = 'completo' }) {
  const { user } = useAuth();
  const toast = useToast();
  const irALogin = useIrALogin();
  const favorito = useToggleFavorito(propiedad.id, queryKey);
  const guardada = propiedad.es_favorito;

  if (propiedad.es_dueno) return null;

  function onClick() {
    if (!user) return irALogin();
    favorito.mutate(!guardada, {
      onSuccess: () => toast(guardada ? 'Quitada de favoritos' : 'Guardada en favoritos', 'success', 2500),
      onError:   (err) => toast(err.message ?? 'No se pudo actualizar favoritos', 'error'),
    });
  }

  const etiqueta = guardada ? 'Quitar de favoritos' : 'Guardar en favoritos';
  const icono = <Heart size={16} aria-hidden="true" className={guardada ? 'fill-danger-600 text-danger-600' : ''} />;

  if (variante === 'icono') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={favorito.isPending}
        aria-label={etiqueta}
        aria-pressed={guardada}
        className="rounded-full border border-secondary-200 bg-white p-2 text-secondary-700 shadow-sm hover:bg-secondary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
      >
        {icono}
      </button>
    );
  }

  return (
    <Button variant="secondary" onClick={onClick} disabled={favorito.isPending} aria-pressed={guardada} className="w-full">
      {icono} {guardada ? 'Guardada' : 'Guardar'}
    </Button>
  );
}

const PROXIMAMENTE = <Badge variant="warning" className="ml-1">Próximamente</Badge>;

export default function AccionesPropiedad({ propiedad, queryKey }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const irALogin = useIrALogin();

  // Mensajes, visitas y reportes dependen de módulos que aún no están listos
  function accionPendiente(mensaje) {
    if (!user) return irALogin();
    toast(`${mensaje} estará disponible próximamente.`, 'info');
  }

  async function compartir() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: propiedad.titulo, url }); } catch { /* el usuario canceló */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Enlace copiado al portapapeles', 'success', 2500);
    } catch {
      toast('No se pudo copiar el enlace', 'error');
    }
  }

  const botonCompartir = (
    <Button variant="text" size="sm" onClick={compartir}>
      <Share2 size={16} aria-hidden="true" /> Compartir
    </Button>
  );

  if (propiedad.es_dueno) {
    return (
      <div className="space-y-2">
        <Button size="lg" className="w-full" onClick={() => navigate(`/mis-propiedades/${propiedad.id}/editar`)}>
          <Pencil size={16} aria-hidden="true" /> Editar
        </Button>
        <div className="flex justify-center">{botonCompartir}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button size="lg" className="w-full" onClick={() => accionPendiente('Contactar al vendedor')}>
        <MessageCircle size={16} aria-hidden="true" /> Contactar vendedor {PROXIMAMENTE}
      </Button>
      <Button variant="secondary" className="w-full" onClick={() => accionPendiente('Solicitar una visita')}>
        <CalendarDays size={16} aria-hidden="true" /> Solicitar visita {PROXIMAMENTE}
      </Button>
      <BotonFavorito propiedad={propiedad} queryKey={queryKey} />
      <div className="flex flex-wrap justify-center gap-1">
        {botonCompartir}
        <Button variant="text" size="sm" onClick={() => accionPendiente('Reportar publicaciones')}>
          <Flag size={16} aria-hidden="true" /> Reportar
        </Button>
      </div>
    </div>
  );
}
