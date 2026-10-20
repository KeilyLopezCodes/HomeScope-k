import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Map, Heart, MessageSquare, CalendarDays,
  PlusSquare, LayoutDashboard, ShieldCheck,
  LogIn, UserPlus, User, LogOut, Menu, X, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../features/auth/authContext';
import { CampanaNotificaciones } from '../../features/mensajes';

/* ── Definición de nav items por rol ─────────────────────────── */
const VISITOR_LINKS = [
  { to: '/propiedades', label: 'Propiedades', icon: Home },
  { to: '/mapa',        label: 'Buscar en mapa', icon: Map },
];
const BUYER_LINKS = [
  { to: '/favoritos', label: 'Favoritos',   icon: Heart },
  { to: '/mensajes',  label: 'Mensajes',    icon: MessageSquare },
  { to: '/mis-visitas', label: 'Mis visitas', icon: CalendarDays },
];
const SELLER_LINKS = [
  { to: '/propiedades/nueva',   label: 'Publicar propiedad',  icon: PlusSquare },
  { to: '/mis-propiedades',     label: 'Mis propiedades',     icon: LayoutDashboard },
  { to: '/panel-vendedor',      label: 'Panel del vendedor',  icon: LayoutDashboard },
  { to: '/mensajes',            label: 'Mensajes',            icon: MessageSquare },
  { to: '/agenda',              label: 'Agenda',              icon: CalendarDays },
];
const ADMIN_LINKS = [
  { to: '/admin', label: 'Administración', icon: ShieldCheck },
];

function buildLinks(rol) {
  const base = [...VISITOR_LINKS];
  if (!rol) return base;
  const roles = Array.isArray(rol) ? rol : [rol];
  const extra = [];
  if (roles.some(r => ['comprador', 'buyer'].includes(r?.toLowerCase()))) extra.push(...BUYER_LINKS);
  if (roles.some(r => ['vendedor', 'seller'].includes(r?.toLowerCase()))) extra.push(...SELLER_LINKS);
  if (roles.some(r => ['admin', 'administrador'].includes(r?.toLowerCase()))) extra.push(...ADMIN_LINKS);
  // deduplicar por `to`
  const seen = new Set(base.map(l => l.to));
  for (const l of extra) if (!seen.has(l.to)) { seen.add(l.to); base.push(l); }
  return base;
}

const linkClass = ({ isActive }) =>
  `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-gray-700 hover:bg-gray-100'
  }`;

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const links = buildLinks(user?.rol);

  async function handleSignOut() {
    setUserOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-blue-600 text-lg shrink-0">
          <Home size={20} />
          HomeScope
        </Link>

        {/* Nav escritorio */}
        <nav className="hidden md:flex items-center gap-1 flex-wrap">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Acciones escritorio */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {user ? (
            <>
              {/* Notificaciones (en tiempo real) */}
              <CampanaNotificaciones />

              {/* Menú usuario */}
              <div className="relative">
                <button
                  onClick={() => setUserOpen(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <User size={15} />
                  <span className="max-w-[120px] truncate">{user.nombre}</span>
                  <ChevronDown size={14} />
                </button>
                {userOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    <Link
                      to="/perfil"
                      onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User size={14} /> Mi perfil
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={14} /> Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>
                <LogIn size={15} /> Iniciar sesión
              </NavLink>
              <NavLink to="/registro" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                <UserPlus size={15} /> Registrarse
              </NavLink>
            </>
          )}
        </div>

        {/* Móvil: campana y botón hamburguesa */}
        <div className="md:hidden flex items-center gap-1">
          {user && <CampanaNotificaciones />}
          <button
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={15} /> {label}
            </NavLink>
          ))}

          <div className="border-t border-gray-100 mt-2 pt-2 flex flex-col gap-1">
            {user ? (
              <>
                <div className="px-3 py-1 text-xs text-gray-400 font-medium uppercase tracking-wide">
                  {user.nombre}
                </div>
                <NavLink
                  to="/perfil"
                  className={linkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  <User size={15} /> Mi perfil
                </NavLink>
                <button
                  onClick={() => { setMenuOpen(false); handleSignOut(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut size={15} /> Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass} onClick={() => setMenuOpen(false)}>
                  <LogIn size={15} /> Iniciar sesión
                </NavLink>
                <NavLink
                  to="/registro"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserPlus size={15} /> Registrarse
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
