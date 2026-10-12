import { Link, useLocation } from 'react-router-dom';
import { Clock, ArrowLeft } from 'lucide-react';

export default function ComingSoonPage() {
  const { pathname } = useLocation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 px-4">
      <Clock size={48} className="text-blue-400" />
      <h1 className="text-2xl font-bold text-gray-800">Próximamente</h1>
      <p className="text-gray-500 max-w-sm">
        La sección <span className="font-mono text-sm bg-gray-100 px-1 rounded">{pathname}</span> está en construcción.
      </p>
      <Link to="/" className="flex items-center gap-2 mt-2 text-blue-600 hover:underline text-sm">
        <ArrowLeft size={15} /> Volver al inicio
      </Link>
    </div>
  );
}
