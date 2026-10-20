import { useParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import ListaConversaciones from '../components/ListaConversaciones';
import VentanaChat from '../components/VentanaChat';

// /mensajes y /mensajes/:id. En escritorio la bandeja y el chat van lado a lado;
// en móvil se ve uno a la vez (el chat tiene botón para volver a la bandeja).
export default function MensajesPage() {
  const { id } = useParams();
  const conversacionId = /^\d+$/.test(id ?? '') ? Number(id) : null;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-secondary-900">Mensajes</h1>
      <div className="grid h-[calc(100dvh-11rem)] min-h-[28rem] overflow-hidden rounded-lg border border-secondary-200 bg-white md:grid-cols-[20rem_1fr]">
        <aside className={['min-h-0 overflow-y-auto border-secondary-200 md:block md:border-r', conversacionId ? 'hidden' : 'block'].join(' ')}>
          <ListaConversaciones seleccionadaId={conversacionId} />
        </aside>
        <section className={['min-h-0 md:block', conversacionId ? 'block' : 'hidden'].join(' ')} aria-label="Conversación">
          {conversacionId ? (
            <VentanaChat key={conversacionId} conversacionId={conversacionId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-secondary-50 p-6 text-center text-secondary-500">
              <MessageSquare size={40} strokeWidth={1.5} className="text-secondary-300" aria-hidden="true" />
              <p className="text-sm">Elige una conversación para ver los mensajes.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
