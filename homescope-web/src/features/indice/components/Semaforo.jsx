// Umbrales del semáforo sobre el puntaje 0–100 del Índice de Conveniencia
const NIVELES = [
  { min: 70, etiqueta: 'Alta',  luz: 'bg-semaforo-verde',    texto: 'text-semaforo-verde'    },
  { min: 40, etiqueta: 'Media', luz: 'bg-semaforo-amarillo', texto: 'text-semaforo-amarillo' },
  { min: 0,  etiqueta: 'Baja',  luz: 'bg-semaforo-rojo',     texto: 'text-semaforo-rojo'     },
];

export function nivelIndice(puntaje) {
  if (puntaje == null) return null;
  return NIVELES.find((n) => puntaje >= n.min);
}

// puntaje: número 0–100, o null/undefined si el índice aún no se ha calculado
export default function Semaforo({ puntaje, className = '' }) {
  const nivel = nivelIndice(puntaje);
  const descripcion = nivel
    ? `Índice de Conveniencia ${nivel.etiqueta.toLowerCase()}: ${Math.round(puntaje)} de 100`
    : 'Índice de Conveniencia sin calcular';

  return (
    <span
      role="img"
      title={descripcion}
      aria-label={descripcion}
      className={['inline-flex items-center gap-1.5 text-xs font-medium', className].join(' ')}
    >
      <span aria-hidden="true" className="inline-flex gap-0.5 rounded-full bg-secondary-800 px-1 py-0.5">
        {[...NIVELES].reverse().map((n) => (
          <span
            key={n.etiqueta}
            className={['h-2 w-2 rounded-full', nivel === n ? n.luz : 'bg-secondary-600'].join(' ')}
          />
        ))}
      </span>
      <span aria-hidden="true" className={nivel ? nivel.texto : 'text-secondary-500'}>
        {nivel ? `${nivel.etiqueta} · ${Math.round(puntaje)}` : 'Índice sin calcular'}
      </span>
    </span>
  );
}
