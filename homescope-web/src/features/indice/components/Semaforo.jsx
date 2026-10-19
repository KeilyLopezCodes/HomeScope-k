// Niveles del semáforo, del más alto al más bajo. El nivel lo decide el backend (`indice_conveniencia.nivel`);
// los umbrales `min` solo se usan si llega un puntaje sin nivel, y son los mismos del algoritmo v1.0.
const NIVELES = [
  { clave: 'verde',    min: 70, etiqueta: 'Alta',  luz: 'bg-semaforo-verde',    texto: 'text-semaforo-verde'    },
  { clave: 'amarillo', min: 40, etiqueta: 'Media', luz: 'bg-semaforo-amarillo', texto: 'text-semaforo-amarillo' },
  { clave: 'rojo',     min: 0,  etiqueta: 'Baja',  luz: 'bg-semaforo-rojo',     texto: 'text-semaforo-rojo'     },
];

// nivel: 'verde' | 'amarillo' | 'rojo' del backend; si no viene, se deduce del puntaje
export function nivelIndice(puntaje, nivel) {
  if (nivel) return NIVELES.find((n) => n.clave === nivel) ?? null;
  if (puntaje == null) return null;
  return NIVELES.find((n) => puntaje >= n.min);
}

export const formatearPuntaje = (puntaje) =>
  Number(puntaje).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function descripcion(nivel, puntaje) {
  return nivel
    ? `Índice de Conveniencia ${nivel.etiqueta.toLowerCase()}: ${formatearPuntaje(puntaje)} de 100`
    : 'Índice de Conveniencia en cálculo';
}

// Versión compacta (tarjetas y resumen): tres luces en línea, nivel y puntaje redondeado.
// puntaje: 0–100, o null/undefined si el índice aún no se ha calculado
export default function Semaforo({ puntaje, nivel: nivelApi, className = '' }) {
  const nivel = nivelIndice(puntaje, nivelApi);

  return (
    <span
      role="img"
      title={descripcion(nivel, puntaje)}
      aria-label={descripcion(nivel, puntaje)}
      className={['inline-flex items-center gap-1.5 text-xs font-medium', className].join(' ')}
    >
      <span aria-hidden="true" className="inline-flex gap-0.5 rounded-full bg-secondary-800 px-1 py-0.5">
        {[...NIVELES].reverse().map((n) => (
          <span
            key={n.clave}
            className={['h-2 w-2 rounded-full', nivel === n ? n.luz : 'bg-secondary-600'].join(' ')}
          />
        ))}
      </span>
      <span aria-hidden="true" className={nivel ? nivel.texto : 'text-secondary-500'}>
        {nivel ? `${nivel.etiqueta} · ${Math.round(puntaje)}` : 'Índice en cálculo'}
      </span>
    </span>
  );
}

// Versión grande (panel de la ficha): semáforo vertical con la luz del nivel encendida
export function SemaforoGrande({ puntaje, nivel: nivelApi, className = '' }) {
  const nivel = nivelIndice(puntaje, nivelApi);

  return (
    <span
      role="img"
      aria-label={descripcion(nivel, puntaje)}
      className={['inline-flex flex-col items-center gap-1.5 rounded-xl bg-secondary-800 p-2 shadow-inner', className].join(' ')}
    >
      {NIVELES.map((n) => (
        <span
          key={n.clave}
          aria-hidden="true"
          className={[
            'h-5 w-5 rounded-full transition-colors',
            nivel === n ? `${n.luz} shadow-[0_0_10px_2px_currentColor] ${n.texto}` : 'bg-secondary-600',
          ].join(' ')}
        />
      ))}
    </span>
  );
}
