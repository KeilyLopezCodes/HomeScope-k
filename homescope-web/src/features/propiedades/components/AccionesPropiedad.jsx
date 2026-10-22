import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Flag, Heart, MessageCircle, Pencil, Share2 } from 'lucide-react';
import { Button, useToast } from '../../../shared/components/ui';
import { useAuth } from '../../auth';
import { BotonComparar, useToggleFavorito } from '../../favoritos';
import { ContactarVendedorModal } from '../../mensajes';
import { SolicitarVisitaModal } from '../../agenda';
import ReportarPublicacionModal from './ReportarPublicacionModal';

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

export default function AccionesPropiedad({ propiedad, queryKey }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const irALogin = useIrALogin();
  const [contactando, setContactando] = useState(false);
  const [agendando, setAgendando] = useState(false);
  const [reportando, setReportando] = useState(false);

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
      <Button size="lg" className="w-full" onClick={() => (user ? setContactando(true) : irALogin())}>
        <MessageCircle size={16} aria-hidden="true" /> Contactar vendedor
      </Button>
      {contactando && (
        <ContactarVendedorModal abierto onCerrar={() => setContactando(false)} propiedad={propiedad} />
      )}
      <Button variant="secondary" className="w-full" onClick={() => (user ? setAgendando(true) : irALogin())}>
        <CalendarDays size={16} aria-hidden="true" /> Solicitar visita
      </Button>
      {agendando && <SolicitarVisitaModal propiedad={propiedad} onCerrar={() => setAgendando(false)} />}
      <BotonFavorito propiedad={propiedad} queryKey={queryKey} />
      {propiedad.estado === 'publicado' && (
        <div className="flex justify-center"><BotonComparar propiedad={propiedad} variante="texto" /></div>
      )}
      <div className="flex flex-wrap justify-center gap-1">
        {botonCompartir}
        <Button variant="text" size="sm" onClick={() => (user ? setReportando(true) : irALogin())}>
          <Flag size={16} aria-hidden="true" /> Reportar
        </Button>
      </div>
      {reportando && <ReportarPublicacionModal propiedad={propiedad} onCerrar={() => setReportando(false)} />}
    </div>
  );
}
