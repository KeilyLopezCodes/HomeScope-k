import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { BarChart3, Flag, History, MessageSquareWarning, Users } from 'lucide-react';
import EstadisticasPlataforma from './EstadisticasPlataforma';
import PublicacionesReportadas from './PublicacionesReportadas';
import UsuariosModeracion from './UsuariosModeracion';
import ComentariosReportados from './ComentariosReportados';
import HistorialAcciones from './HistorialAcciones';

const SECCIONES = [
  { ruta: '',             titulo: 'Estadísticas', icono: BarChart3,            Pagina: EstadisticasPlataforma },
  { ruta: 'publicaciones', titulo: 'Publicaciones', icono: Flag,                Pagina: PublicacionesReportadas },
  { ruta: 'usuarios',     titulo: 'Usuarios',     icono: Users,                Pagina: UsuariosModeracion },
  { ruta: 'comentarios',  titulo: 'Comentarios',  icono: MessageSquareWarning, Pagina: ComentariosReportados },
  { ruta: 'historial',    titulo: 'Historial',    icono: History,              Pagina: HistorialAcciones },
];

// Panel de administración: estadísticas generales y moderación de lo reportado (/admin/...)
export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-secondary-900">Administración</h1>
        <p className="text-sm text-secondary-500">Estadísticas de la plataforma y moderación de publicaciones, usuarios y comentarios reportados.</p>
      </div>

      <nav aria-label="Secciones de administración" className="-mx-4 mb-6 overflow-x-auto px-4">
        <ul className="flex min-w-max gap-1 border-b border-secondary-200">
          {SECCIONES.map(({ ruta, titulo, icono: Icono }) => (
            <li key={ruta}>
              <NavLink
                to={ruta ? `/admin/${ruta}` : '/admin'}
                end
                className={({ isActive }) => [
                  '-mb-px flex items-center gap-1.5 whitespace-nowrap rounded-t border-b-2 px-3 py-2 text-sm font-medium',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  isActive ? 'border-primary-600 text-primary-700' : 'border-transparent text-secondary-500 hover:text-secondary-800',
                ].join(' ')}
              >
                <Icono size={16} aria-hidden="true" /> {titulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Routes>
        {SECCIONES.map(({ ruta, Pagina }) => (
          <Route key={ruta} index={!ruta} path={ruta || undefined} element={<Pagina />} />
        ))}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
}
