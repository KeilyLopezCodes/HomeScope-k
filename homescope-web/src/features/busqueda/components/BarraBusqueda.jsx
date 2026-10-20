import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

const ESPERA_MS = 450;

// valor: texto aplicado (de la URL). onBuscar(texto | undefined) aplica la búsqueda.
// Se aplica sola al dejar de escribir, o al presionar Enter. Menos de 2 letras no buscan.
export default function BarraBusqueda({ valor = '', onBuscar }) {
  const [texto, setTexto] = useState(valor);
  const aplicado = useRef(valor);

  // Si la búsqueda cambia desde fuera (limpiar filtros, Atrás), el campo la refleja
  useEffect(() => {
    aplicado.current = valor;
    setTexto(valor);
  }, [valor]);

  function aplicar(t) {
    const limpio = t.trim();
    if (limpio.length === 1) return; // muy corto: se espera a la siguiente letra
    if (limpio === aplicado.current) return;
    aplicado.current = limpio;
    onBuscar(limpio || undefined);
  }

  useEffect(() => {
    const id = setTimeout(() => aplicar(texto), ESPERA_MS);
    return () => clearTimeout(id);
  }, [texto]);

  const muyCorto = texto.trim().length === 1;

  return (
    <form
      role="search"
      onSubmit={(e) => { e.preventDefault(); aplicar(texto); }}
      className="relative"
    >
      <label htmlFor="busqueda-texto" className="sr-only">Buscar propiedades</label>
      <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" aria-hidden="true" />
      <input
        id="busqueda-texto"
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={100}
        placeholder="Busca por zona, municipio, dirección o palabra clave (ej. casa con jardín, zona 10)"
        aria-describedby={muyCorto ? 'busqueda-ayuda' : undefined}
        className="w-full rounded-lg border border-secondary-300 bg-white py-2.5 pl-10 pr-10 text-sm text-secondary-900 shadow-sm placeholder:text-secondary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 [&::-webkit-search-cancel-button]:hidden"
      />
      {texto && (
        <button
          type="button"
          onClick={() => { setTexto(''); aplicar(''); }}
          aria-label="Borrar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
      {muyCorto && (
        <p id="busqueda-ayuda" className="absolute -bottom-5 left-1 text-xs text-secondary-500">Escribe al menos 2 letras</p>
      )}
    </form>
  );
}
