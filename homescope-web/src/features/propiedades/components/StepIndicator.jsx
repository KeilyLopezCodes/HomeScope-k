const PASOS = ['Datos generales', 'Fotos', 'Ubicación', 'Confirmación'];

export default function StepIndicator({ current }) {
  return (
    <ol className="flex items-center w-full mb-8">
      {PASOS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={i} className={`flex items-center ${i < PASOS.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors
                  ${done ? 'bg-emerald-600 border-emerald-600 text-white' : active ? 'bg-white border-emerald-600 text-emerald-600' : 'bg-white border-gray-300 text-gray-400'}`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`mt-1 text-xs hidden sm:block ${active ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? 'bg-emerald-600' : 'bg-gray-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
