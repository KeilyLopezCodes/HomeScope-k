import { Home, Search } from 'lucide-react';

const TAMANOS = {
  sm: { caja: 'h-12 w-12 rounded-xl',   casa: 'h-6 w-6',   lupa: 'h-5 w-5 -bottom-1.5 -right-1.5 rounded-md',  iconoLupa: 'h-3 w-3' },
  md: { caja: 'h-16 w-16 rounded-2xl',  casa: 'h-9 w-9',   lupa: 'h-7 w-7 -bottom-2 -right-2 rounded-lg',      iconoLupa: 'h-4 w-4' },
  lg: { caja: 'h-24 w-24 rounded-3xl',  casa: 'h-14 w-14', lupa: 'h-10 w-10 -bottom-2.5 -right-2.5 rounded-xl', iconoLupa: 'h-5 w-5' },
};

// color: casa blanca sobre azul (fondos claros) · claro: casa azul sobre blanco (fondos azules)
const VARIANTES = {
  color: 'bg-gradient-to-br from-primary-500 to-primary-800 text-white',
  claro: 'bg-gradient-to-br from-white to-primary-100 text-primary-700',
};

// Logo de HomeScope: una casa con una lupa ("ver" las propiedades y lo que tienen cerca).
// Es decorativo: el nombre de la app va siempre en texto junto a él
export default function LogoHomeScope({ tamano = 'md', variante = 'color', className = '' }) {
  const t = TAMANOS[tamano] ?? TAMANOS.md;
  return (
    <span aria-hidden="true" className={['relative inline-flex shrink-0', className].join(' ')}>
      <span className={`flex items-center justify-center shadow-md ${VARIANTES[variante] ?? VARIANTES.color} ${t.caja}`}>
        <Home className={t.casa} strokeWidth={2.25} />
      </span>
      <span className={`absolute flex items-center justify-center bg-cyan-400 text-primary-900 shadow ring-2 ring-white ${t.lupa}`}>
        <Search className={t.iconoLupa} strokeWidth={2.75} />
      </span>
    </span>
  );
}
