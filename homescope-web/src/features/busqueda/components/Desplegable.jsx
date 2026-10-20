import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Botón de filtro que abre un panel. Se cierra con Escape, al hacer clic fuera o desde el contenido
// con cerrar(). activo resalta el botón cuando el filtro está aplicado; resumen reemplaza la etiqueta.
// children: (cerrar) => contenido
export default function Desplegable({ etiqueta, resumen, activo = false, ancho = 'w-64', children }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);
  const boton = useRef(null);
  const idPanel = useId();

  useEffect(() => {
    if (!abierto) return;
    function fuera(e) { if (!contenedor.current?.contains(e.target)) setAbierto(false); }
    function tecla(e) {
      if (e.key === 'Escape') { setAbierto(false); boton.current?.focus(); }
    }
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const cerrar = () => { setAbierto(false); boton.current?.focus(); };

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={idPanel}
        className={[
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          activo
            ? 'border-primary-600 bg-primary-50 text-primary-700'
            : 'border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50',
        ].join(' ')}
      >
        {resumen ?? etiqueta}
        <ChevronDown size={14} aria-hidden="true" className={['transition-transform', abierto ? 'rotate-180' : ''].join(' ')} />
      </button>
      {abierto && (
        <div
          id={idPanel}
          role="dialog"
          aria-label={etiqueta}
          className={[
            'absolute left-0 z-30 mt-2 max-w-[calc(100vw-2rem)] rounded-lg border border-secondary-200 bg-white p-3 shadow-lg',
            ancho,
          ].join(' ')}
        >
          {children(cerrar)}
        </div>
      )}
    </div>
  );
}
