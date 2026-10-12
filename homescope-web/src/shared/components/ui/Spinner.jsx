import { Loader2 } from 'lucide-react';

const SIZES = { sm: 16, md: 24, lg: 40 };

export default function Spinner({ size = 'md', label = 'Cargando…', className = '' }) {
  return (
    <div role="status" aria-label={label} className={['flex items-center justify-center', className].join(' ')}>
      <Loader2 size={SIZES[size] ?? SIZES.md} className="animate-spin text-primary-600" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
