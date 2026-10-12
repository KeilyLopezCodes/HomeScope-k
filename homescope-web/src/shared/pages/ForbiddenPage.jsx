import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 px-4">
      <ShieldOff size={48} className="text-red-400" />
      <h1 className="text-4xl font-bold text-gray-800">403</h1>
      <p className="text-gray-500 max-w-sm">No tienes permiso para acceder a esta página.</p>
      <Link to="/" className="flex items-center gap-2 mt-2 text-blue-600 hover:underline text-sm">
        <ArrowLeft size={15} /> Volver al inicio
      </Link>
    </div>
  );
}
