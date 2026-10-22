import { Home } from 'lucide-react';
import { Semaforo } from '../../indice';
import { MODALIDAD, formatearPrecio, ubicacionResumida } from '../../propiedades/utils/formato';

// "3 hab · 2 baños · 180 m²"
const caracteristicas = (p) => [
  p.habitaciones != null && `${p.habitaciones} hab`,
  p.banos != null && `${Number(p.banos)} ${Number(p.banos) === 1 ? 'baño' : 'baños'}`,
  p.area_m2 != null && `${Number(p.area_m2).toLocaleString('es-GT')} m²`,
].filter(Boolean).join(' · ');

// Tarjeta resumen que se abre al tocar un marcador. Se dibuja dentro de la ventana de información de
// Google Maps (fuera del árbol de React Router): el enlace navega con onVerFicha
export default function TarjetaMapa({ propiedad: p, onVerFicha }) {
  const portada = p.fotos?.[0]?.url;
  const ruta = `/propiedades/${p.id}`;
  return (
    <div className="w-60 font-sans">
      <div className="mb-2 aspect-[16/10] overflow-hidden rounded bg-secondary-100">
        {portada
          ? <img src={portada} alt="" className="h-full w-full object-cover" />
          : <div className="flex h-full items-center justify-center text-secondary-300"><Home size={28} aria-hidden="true" /></div>}
      </div>
      <p className="text-base font-bold text-secondary-900">
        {formatearPrecio(p.precio, p.moneda)}
        {p.modalidad === 'alquiler' && <span className="text-xs font-normal text-secondary-500"> /mes</span>}
      </p>
      <p className="line-clamp-2 text-sm font-medium text-secondary-800">{p.titulo}</p>
      <p className="text-xs text-secondary-500">
        <span className="capitalize">{p.tipo_propiedad?.nombre}</span>
        {MODALIDAD[p.modalidad] && ` · ${MODALIDAD[p.modalidad].etiqueta}`}
        {caracteristicas(p) && ` · ${caracteristicas(p)}`}
      </p>
      <p className="line-clamp-1 text-xs text-secondary-500">{ubicacionResumida(p)}</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <Semaforo puntaje={p.indice_conveniencia?.puntaje} nivel={p.indice_conveniencia?.nivel} />
        <a
          href={ruta}
          onClick={(e) => { e.preventDefault(); onVerFicha(p.id); }}
          className="whitespace-nowrap rounded bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Ver ficha
        </a>
      </div>
    </div>
  );
}
