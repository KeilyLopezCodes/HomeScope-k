export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
        <span>© {new Date().getFullYear()} HomeScope — Todos los derechos reservados.</span>
        <span className="text-xs text-gray-400">
          Datos cartográficos © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">OpenStreetMap</a> contributors
        </span>
      </div>
    </footer>
  );
}
