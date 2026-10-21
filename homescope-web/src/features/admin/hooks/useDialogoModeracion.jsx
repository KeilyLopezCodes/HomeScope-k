import { useState } from 'react';
import { useToast } from '../../../shared/components/ui';
import DialogoAccion from '../components/DialogoAccion';

// Abre el diálogo de una acción y la ejecuta con el motivo escrito.
//   abrir(accion, ejecutar): accion = textos del diálogo (+ exito: mensaje al terminar);
//   ejecutar(motivo) = promesa que llama al backend
export function useDialogoModeracion() {
  const toast = useToast();
  const [actual, setActual] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function confirmar(motivo) {
    setEnviando(true);
    try {
      await actual.ejecutar(motivo);
      toast(actual.accion.exito, 'success');
      setActual(null);
    } finally {
      setEnviando(false); // si falla, el diálogo muestra el mensaje del backend y sigue abierto
    }
  }

  const dialogo = (
    <DialogoAccion accion={actual?.accion} onCerrar={() => setActual(null)} onConfirmar={confirmar} enviando={enviando} />
  );
  return { abrir: (accion, ejecutar) => setActual({ accion, ejecutar }), dialogo };
}
