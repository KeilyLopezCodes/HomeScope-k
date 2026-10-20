import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Info } from 'lucide-react';
import { Button, useToast } from '../../../shared/components/ui';
import { useAuth } from '../../auth';
import { ETIQUETAS_CALIFICACION, Estrellas, SelectorEstrellas } from './Estrellas';
import { useCrearResena, useElegibilidad } from '../hooks/useResenas';
import { fechaResena } from '../utils/fechas';

const MAX_COMENTARIO = 1000;
const POR = { contacto: 'le escribiste al vendedor por esta propiedad', visita: 'ya visitaste esta propiedad' };

function TuResena({ resena }) {
  return (
    <div className="rounded-lg border border-success-200 bg-success-50 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-success-700">
        <CheckCircle2 size={16} aria-hidden="true" /> Tu reseña
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Estrellas valor={resena.calificacion} tamano={16} />
        <span className="text-xs text-secondary-500">{fechaResena(resena.fecha_creacion)}</span>
      </div>
      {resena.comentario && <p className="mt-2 text-sm text-secondary-700">{resena.comentario}</p>}
    </div>
  );
}

// Formulario para calificar al vendedor de la propiedad. Solo se muestra si la API confirma que el usuario
// tuvo contacto o una visita previa; en los demás casos se explica por qué no (o nada, si es el dueño).
export default function FormularioResena({ propiedad }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { data: elegibilidad, isPending } = useElegibilidad(propiedad.id, { enabled: Boolean(user) && !propiedad.es_dueno });
  const crear = useCrearResena(propiedad.vendedor.id);
  const toast = useToast();
  const [calificacion, setCalificacion] = useState(null);
  const [comentario, setComentario] = useState('');

  if (propiedad.es_dueno) return null;

  if (!user) {
    return (
      <p className="flex items-start gap-2 rounded-md bg-secondary-50 p-3 text-sm text-secondary-600">
        <Info size={16} className="mt-0.5 shrink-0 text-secondary-400" aria-hidden="true" />
        <span>
          ¿Contactaste o visitaste esta propiedad?{' '}
          <Link to="/login" state={{ from: pathname }} className="font-medium text-primary-600 hover:underline">Inicia sesión</Link>{' '}
          para calificar al vendedor.
        </span>
      </p>
    );
  }

  if (isPending || elegibilidad.motivo === 'PROPIEDAD_PROPIA') return null;
  if (elegibilidad.motivo === 'YA_RESENADA') return <TuResena resena={elegibilidad.resena} />;
  if (!elegibilidad.puede_resenar) {
    return (
      <p className="flex items-start gap-2 rounded-md bg-secondary-50 p-3 text-sm text-secondary-600">
        <Info size={16} className="mt-0.5 shrink-0 text-secondary-400" aria-hidden="true" />
        Podrás calificar al vendedor después de escribirle por esta propiedad o de visitarla.
      </p>
    );
  }

  function enviar(e) {
    e.preventDefault();
    if (!calificacion) return;
    crear.mutate({ propiedadId: propiedad.id, calificacion, comentario: comentario.trim() }, {
      onSuccess: () => toast('¡Gracias! Tu reseña ya es visible en el perfil del vendedor.', 'success'),
      onError: (err) => toast(err.message ?? 'No se pudo publicar la reseña', 'error'),
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-lg border border-primary-200 bg-primary-50/40 p-4">
      <div>
        <p className="text-sm font-semibold text-secondary-900">Califica a {propiedad.vendedor.nombre}</p>
        <p className="text-xs text-secondary-500">
          Puedes hacerlo porque {elegibilidad.por.map((p) => POR[p]).join(' y ')}.
        </p>
      </div>

      <SelectorEstrellas id="resena-calificacion" valor={calificacion} onChange={setCalificacion} />

      <div>
        <label htmlFor="resena-comentario" className="mb-1 block text-sm font-medium text-secondary-700">
          Comentario <span className="font-normal text-secondary-400">(opcional)</span>
        </label>
        <textarea
          id="resena-comentario"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={MAX_COMENTARIO}
          rows={3}
          placeholder="¿Cómo fue tu experiencia con el vendedor? ¿Respondió a tiempo? ¿La propiedad era como en el anuncio?"
          className="w-full resize-y rounded border border-secondary-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p className="text-right text-[11px] text-secondary-400">{comentario.length} / {MAX_COMENTARIO}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-secondary-500">Tu nombre y tu reseña serán públicos. Solo puedes calificar una vez por propiedad.</p>
        <Button type="submit" disabled={!calificacion} loading={crear.isPending}>
          {calificacion ? `Publicar (${ETIQUETAS_CALIFICACION[calificacion]})` : 'Publicar reseña'}
        </Button>
      </div>
    </form>
  );
}
