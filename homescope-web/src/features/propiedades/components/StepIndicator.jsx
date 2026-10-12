import { Check } from 'lucide-react';

const PASOS = ['Datos generales', 'Fotos', 'Ubicación', 'Confirmación'];

export default function StepIndicator({ current }) {
  return (
    <ol className="flex items-start w-full mb-8" aria-label="Pasos del formulario">
      {PASOS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <li
            key={i}
            aria-current={active ? 'step' : undefined}
            className={`flex items-center ${i < PASOS.length - 1 ? 'flex-1' : ''}`}
          >
            <div className="flex flex-col items-center">
              <span
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                  done   ? 'bg-primary-600 border-primary-600 text-white'  : '',
                  active ? 'bg-white border-primary-600 text-primary-600'  : '',
                  !done && !active ? 'bg-white border-secondary-300 text-secondary-400' : '',
                ].join(' ')}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span
                className={[
                  'mt-1 text-xs hidden sm:block whitespace-nowrap',
                  active ? 'text-primary-600 font-medium' : 'text-secondary-400',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${done ? 'bg-primary-600' : 'bg-secondary-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
