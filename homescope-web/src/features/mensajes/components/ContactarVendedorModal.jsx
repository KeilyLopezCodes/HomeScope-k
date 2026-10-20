import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { Button, Modal, useToast } from '../../../shared/components/ui';
import { iniciarConversacion } from '../services/mensajesService';
import { CLAVES } from '../hooks/useMensajeria';

// Abre (o retoma) la conversación con el vendedor de una propiedad y lleva al chat
export default function ContactarVendedorModal({ abierto, onCerrar, propiedad }) {
  const [texto, setTexto] = useState(`Hola, me interesa "${propiedad.titulo}". ¿Sigue disponible?`);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const { conversacion } = await iniciarConversacion(propiedad.id, texto.trim());
      queryClient.invalidateQueries({ queryKey: CLAVES.conversaciones });
      onCerrar();
      navigate(`/mensajes/${conversacion.id}`);
    } catch (err) {
      toast(err.message ?? 'No se pudo enviar el mensaje', 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open={abierto} onClose={onCerrar} title={`Escribir a ${propiedad.vendedor?.nombre ?? 'el vendedor'}`}>
      <form onSubmit={enviar} className="space-y-3">
        <label htmlFor="contactar-mensaje" className="block text-sm font-medium text-secondary-700">Tu mensaje</label>
        <textarea
          id="contactar-mensaje"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full resize-y rounded border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p className="flex items-start gap-1.5 text-xs text-secondary-500">
          <Lock size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          El vendedor recibirá tu mensaje en HomeScope. Tu correo y tu teléfono no se comparten.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" loading={enviando} disabled={!texto.trim()}>Enviar mensaje</Button>
        </div>
      </form>
    </Modal>
  );
}
