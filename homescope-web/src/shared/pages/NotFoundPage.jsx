import { Link } from 'react-router-dom';
import { SearchX, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 px-4">
      <SearchX size={48} className="text-gray-400" />
      <h1 className="text-4xl font-bold text-gray-800">404</h1>
      <p className="text-gray-500 max-w-sm">La página que buscas no existe o fue movida.</p>
      <Link to="/" className="flex items-center gap-2 mt-2 text-blue-600 hover:underline text-sm">
        <ArrowLeft size={15} /> Volver al inicio
      </Link>
    </div>
  );
}
