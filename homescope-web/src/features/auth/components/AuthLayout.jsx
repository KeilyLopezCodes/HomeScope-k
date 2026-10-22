import { Link } from 'react-router-dom';
import { BadgeCheck, Gauge, MapPinned } from 'lucide-react';
import LogoHomeScope from '../../../shared/components/LogoHomeScope';

const VENTAJAS = [
  { Icono: MapPinned,  texto: 'Busca sobre el mapa y filtra por lo que necesitas' },
  { Icono: Gauge,      texto: 'Índice de Conveniencia: lo que tienes cerca, en un número' },
  { Icono: BadgeCheck, texto: 'Vendedores con identidad verificada' },
];

// Mapa ilustrado (decorativo): calles, manzanas, marcadores con precio y el radio del Índice de Conveniencia.
// Es un SVG propio: la pantalla de acceso no carga Google Maps ni consume su cuota
function MapaIlustrado() {
  const calle = { stroke: 'white', strokeOpacity: 0.14, fill: 'none', strokeLinecap: 'round' };
  const marcador = (x, y, precio, destacado = false) => (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-34" y="-30" width="68" height="24" rx="12" fill={destacado ? '#22d3ee' : 'white'} fillOpacity={destacado ? 0.95 : 0.9} />
      <text x="0" y="-13.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e3a8a" fontFamily="system-ui, sans-serif">{precio}</text>
      <path d="M -5 -6 L 0 2 L 5 -6 Z" fill={destacado ? '#22d3ee' : 'white'} fillOpacity={destacado ? 0.95 : 0.9} />
    </g>
  );
  return (
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
      {/* Manzanas */}
      {[[40, 60, 150, 110], [230, 40, 120, 150], [400, 70, 170, 120], [60, 240, 130, 160], [250, 260, 140, 120], [430, 260, 130, 170],
        [30, 470, 170, 130], [260, 450, 110, 170], [420, 500, 150, 120], [70, 660, 140, 110], [270, 680, 160, 100], [460, 680, 110, 100]]
        .map(([x, y, w, h]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="10" fill="white" fillOpacity="0.05" />)}
      {/* Calles principales y secundarias */}
      <path d="M 0 210 C 150 200 330 230 600 205" strokeWidth="14" {...calle} />
      <path d="M 0 430 C 200 445 380 410 600 440" strokeWidth="10" {...calle} />
      <path d="M 210 0 C 220 250 190 520 225 800" strokeWidth="12" {...calle} />
      <path d="M 395 0 L 410 800" strokeWidth="8" {...calle} />
      <path d="M 0 630 L 600 650" strokeWidth="6" {...calle} />
      <path d="M 20 0 L 120 800" strokeWidth="4" {...calle} />
      <path d="M 600 120 C 480 300 520 520 590 800" strokeWidth="4" {...calle} />
      {/* Río */}
      <path d="M -10 560 C 120 520 180 600 300 575 S 480 520 610 560" stroke="#7dd3fc" strokeOpacity="0.25" strokeWidth="18" fill="none" strokeLinecap="round" />
      {/* Todo en las orillas: el centro queda libre para el logo y el texto */}
      {/* Radio del Índice de Conveniencia con lugares cercanos */}
      <circle cx="488" cy="690" r="88" fill="#22d3ee" fillOpacity="0.08" stroke="#22d3ee" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="6 7" />
      {[[440, 650], [535, 655], [455, 745], [540, 735], [500, 620]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="6" fill="white" fillOpacity="0.55" />
      ))}
      {/* Propiedades */}
      {marcador(488, 698, 'Q 450 mil', true)}
      {marcador(105, 125, 'Q 3,400')}
      {marcador(495, 100, 'US$ 95 mil')}
      {marcador(80, 690, 'Q 1.2 M')}
      {marcador(270, 790, 'Q 260 mil')}
    </svg>
  );
}

// Pantallas de acceso (iniciar sesión, registrarse): marca y mapa a la izquierda, formulario a la derecha.
// En pantallas pequeñas la marca queda como una franja arriba del formulario
export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <aside className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-800 to-[#0b1d4a] text-white">
        <MapaIlustrado />
        {/* Velo para que el texto se lea sobre el mapa */}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0b1d4a]/70 via-transparent to-primary-700/30" />
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgba(11,29,74,0.55),transparent)]" />

        <div className="relative flex h-full flex-col items-center justify-center gap-6 px-6 py-10 text-center lg:px-12">
          <Link to="/propiedades" className="flex flex-col items-center gap-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="HomeScope, ir al catálogo">
            <LogoHomeScope tamano="lg" variante="claro" className="hidden sm:inline-flex" />
            <LogoHomeScope tamano="md" variante="claro" className="sm:hidden" />
            <span className="text-4xl font-extrabold tracking-tight drop-shadow lg:text-5xl">HomeScope</span>
          </Link>
          <p className="max-w-sm text-sm text-primary-100 sm:text-base">
            Compra, vende y alquila propiedades en Guatemala sabiendo qué tienes cerca antes de visitarlas.
          </p>
          <ul className="hidden space-y-3 text-left text-sm lg:block">
            {VENTAJAS.map(({ Icono, texto }) => (
              <li key={texto} className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                <Icono size={18} className="shrink-0 text-cyan-300" aria-hidden="true" /> {texto}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

// Estilos de los campos de las pantallas de acceso (con los colores de la app)
export const estiloCampo = (error) => [
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-secondary-900 placeholder:text-secondary-400 transition-colors',
  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
  error ? 'border-danger-500' : 'border-secondary-300',
].join(' ');
export const estiloEtiqueta = 'mb-1 block text-sm font-medium text-secondary-700';
export const estiloError = 'mt-1 text-xs text-danger-600';
