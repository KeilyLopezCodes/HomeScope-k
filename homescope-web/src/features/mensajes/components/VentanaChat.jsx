import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Lock, SendHorizontal, WifiOff } from 'lucide-react';
import { Button, Spinner, useToast } from '../../../shared/components/ui';
import { useSocket } from '../../../shared/realtime/SocketProvider';
import { useEnviarMensaje, useMarcarLeida, useMensajes } from '../hooks/useMensajeria';
import { horaMensaje } from '../utils/tiempo';

const MAX_CARACTERES = 2000;

function etiquetaDia(fecha) {
  const d = new Date(fecha);
  const hoy = new Date();
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return 'Hoy';
  if (d.toDateString() === ayer.toDateString()) return 'Ayer';
  return new Intl.DateTimeFormat('es-GT', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

function Burbuja({ m }) {
  return (
    <div className={['flex', m.es_mio ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%]',
          m.es_mio ? 'rounded-br-md bg-primary-600 text-white' : 'rounded-bl-md bg-white text-secondary-800',
        ].join(' ')}
      >
        <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
        <p className={['mt-0.5 text-right text-[10px]', m.es_mio ? 'text-primary-100' : 'text-secondary-400'].join(' ')}>
          {horaMensaje(m.fecha_envio)}
          {m.es_mio && m.leido_en && ' · Leído'}
        </p>
      </div>
    </div>
  );
}

export default function VentanaChat({ conversacionId }) {
  const { data, isPending, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useMensajes(conversacionId);
  const enviar = useEnviarMensaje(conversacionId);
  const marcarLeida = useMarcarLeida();
  const { estado } = useSocket();
  const sinTiempoReal = ['reconectando', 'sin_internet'].includes(estado);
  const toast = useToast();
  const [texto, setTexto] = useState('');

  const lista = useRef(null);
  const cercaDelFondo = useRef(true);
  const distanciaAlFondo = useRef(null); // para conservar la posición al cargar mensajes anteriores
  const ultimoMarcado = useRef(null);

  const conversacion = data?.pages[0]?.conversacion;
  // La API entrega del más reciente al más antiguo; el chat se lee de arriba (antiguo) a abajo (reciente)
  const mensajes = useMemo(() => (data ? data.pages.flatMap((p) => p.data).reverse() : []), [data]);
  const ultimo = mensajes[mensajes.length - 1];

  useEffect(() => { setTexto(''); cercaDelFondo.current = true; }, [conversacionId]);

  // Al abrir la conversación y cada vez que llega un mensaje del otro, se marca como leída
  useEffect(() => {
    if (!data || ultimoMarcado.current === `${conversacionId}:${ultimo?.id}`) return;
    ultimoMarcado.current = `${conversacionId}:${ultimo?.id}`;
    if (mensajes.some((m) => !m.es_mio && !m.leido_en)) marcarLeida.mutate(conversacionId);
  }, [conversacionId, ultimo?.id, Boolean(data)]);

  useLayoutEffect(() => {
    const el = lista.current;
    if (!el) return;
    if (distanciaAlFondo.current != null) {
      // Se cargaron mensajes anteriores arriba: mantener a la vista lo que se estaba leyendo
      el.scrollTop = el.scrollHeight - distanciaAlFondo.current;
      distanciaAlFondo.current = null;
    } else if (cercaDelFondo.current || ultimo?.es_mio) {
      // Mensaje nuevo: bajar al final, salvo que se estén leyendo mensajes antiguos
      el.scrollTop = el.scrollHeight;
    }
  }, [mensajes.length, conversacionId]);

  function alDesplazar() {
    const el = lista.current;
    cercaDelFondo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function cargarAnteriores() {
    const el = lista.current;
    distanciaAlFondo.current = el.scrollHeight - el.scrollTop;
    fetchNextPage();
  }

  function enviarMensaje(e) {
    e?.preventDefault();
    const contenido = texto.trim();
    if (!contenido || enviar.isPending) return;
    cercaDelFondo.current = true;
    enviar.mutate(contenido, {
      onSuccess: () => setTexto(''),
      onError: (err) => toast(err.message ?? 'No se pudo enviar el mensaje', 'error'),
    });
  }

  if (isPending) return <Spinner label="Cargando mensajes…" className="h-full py-16" />;
  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm font-medium text-secondary-700">
          {error?.status === 404 ? 'Esta conversación no existe o no participas en ella.' : 'No se pudieron cargar los mensajes.'}
        </p>
        <Link to="/mensajes" className="text-sm font-medium text-primary-600 hover:underline">Volver a mis mensajes</Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Encabezado: con quién hablo y sobre qué propiedad */}
      <div className="flex items-center gap-3 border-b border-secondary-200 bg-white px-3 py-2.5">
        <Link to="/mensajes" aria-label="Volver a mis mensajes" className="rounded p-1 text-secondary-500 hover:bg-secondary-100 md:hidden">
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-secondary-900">{conversacion.contraparte.nombre}</p>
          <p className="truncate text-xs text-secondary-500">
            {conversacion.rol === 'comprador' ? 'Vendedor de ' : 'Interesado en '}
            <Link to={`/propiedades/${conversacion.propiedad.id}`} className="font-medium text-primary-600 hover:underline">
              {conversacion.propiedad.titulo}
            </Link>
          </p>
        </div>
        {sinTiempoReal && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-medium text-warning-700"
            title="Puedes seguir enviando mensajes. Los nuevos aparecen cada 15 segundos hasta que vuelva la conexión."
          >
            <WifiOff size={12} aria-hidden="true" /> Sin tiempo real
          </span>
        )}
      </div>

      {/* Mensajes */}
      <div ref={lista} onScroll={alDesplazar} className="flex-1 space-y-2 overflow-y-auto bg-secondary-50 px-3 py-4" aria-live="polite">
        {hasNextPage && (
          <div className="flex justify-center">
            <Button variant="text" size="sm" onClick={cargarAnteriores} loading={isFetchingNextPage}>
              Cargar mensajes anteriores
            </Button>
          </div>
        )}
        <p className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-center text-[11px] text-secondary-500 shadow-sm">
          <Lock size={11} aria-hidden="true" /> Tu correo y tu teléfono no se comparten en esta conversación
        </p>
        {mensajes.length === 0 && (
          <p className="pt-8 text-center text-sm text-secondary-500">Escribe el primer mensaje.</p>
        )}
        {mensajes.map((m, i) => {
          const nuevoDia = i === 0 || new Date(mensajes[i - 1].fecha_envio).toDateString() !== new Date(m.fecha_envio).toDateString();
          return (
            <Fragment key={m.id}>
              {nuevoDia && (
                <p className="pt-2 text-center text-[11px] font-medium uppercase tracking-wide text-secondary-400">
                  {etiquetaDia(m.fecha_envio)}
                </p>
              )}
              <Burbuja m={m} />
            </Fragment>
          );
        })}
      </div>

      {/* Escribir */}
      <form onSubmit={enviarMensaje} className="border-t border-secondary-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <label htmlFor="chat-mensaje" className="sr-only">Escribe un mensaje</label>
          <textarea
            id="chat-mensaje"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) enviarMensaje(e);
            }}
            rows={Math.min(5, Math.max(1, texto.split('\n').length))}
            maxLength={MAX_CARACTERES}
            placeholder="Escribe un mensaje…"
            className="flex-1 resize-none rounded-xl border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button type="submit" disabled={!texto.trim() || enviar.isPending} aria-label="Enviar mensaje" className="h-10 w-10 shrink-0 !p-0">
            {enviar.isPending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <SendHorizontal size={18} aria-hidden="true" />}
          </Button>
        </div>
        <p className="mt-1 flex justify-between text-[11px] text-secondary-400">
          <span>Enter para enviar · Shift + Enter para un salto de línea</span>
          {texto.length > MAX_CARACTERES - 200 && <span>{texto.length} / {MAX_CARACTERES}</span>}
        </p>
      </form>
    </div>
  );
}
