import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, CheckCircle2, Flag, RotateCcw, Search, Users } from 'lucide-react';
import { Button, Card, EmptyState, Input, Pagination, Spinner } from '../../../shared/components/ui';
import { useAuth } from '../../auth';
import { useEjecutarAccion, useUsuariosAdmin } from '../hooks/useAdmin';
import { useDialogoModeracion } from '../hooks/useDialogoModeracion';
import { BadgeEstado, ChipsMotivos, ESTADOS_CUENTA, Filtros, ListaReportes, fecha, fechaHora } from '../components/comunes';

const PAGE_SIZE = 10;
const VISTAS = [
  { valor: 'reportados',  etiqueta: 'Reportados' },
  { valor: 'suspendidos', etiqueta: 'Suspendidos' },
  { valor: 'todos',       etiqueta: 'Todos' },
];
const FILTROS_VISTA = {
  reportados:  { reportados: true },
  suspendidos: { estado: 'suspendido' },
  todos:       {},
};
const ROLES_ADMIN = ['administrador', 'admin'];

const ACCION = {
  aprobar: () => ({
    titulo: 'Descartar reportes', confirmar: 'Aprobar', variante: 'primary',
    descripcion: 'Los reportes contra este usuario no proceden: se descartan y la cuenta sigue igual.',
    exito: 'Reportes descartados',
  }),
  suspender: (u) => ({
    titulo: 'Suspender cuenta', confirmar: 'Suspender', variante: 'danger',
    descripcion: `Pierde el acceso de inmediato y se cierran sus sesiones.${u.propiedades_publicadas
      ? ` Sus ${u.propiedades_publicadas} publicaciones se pausan mientras dure la suspensión.` : ''} Puedes reactivarla después.`,
    exito: 'Cuenta suspendida',
  }),
  reactivar: () => ({
    titulo: 'Reactivar cuenta', confirmar: 'Reactivar', variante: 'primary',
    descripcion: 'Recupera el acceso y vuelven a publicarse las publicaciones que pausó la suspensión. Recibirá una notificación.',
    exito: 'Cuenta reactivada',
  }),
};

function TarjetaUsuario({ u, esYo, onAccion }) {
  const esAdmin = u.roles.some((r) => ROLES_ADMIN.includes(r.toLowerCase()));
  return (
    <Card className="space-y-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-secondary-900 break-words">{u.nombre} {u.apellido}{esYo && ' (tú)'}</p>
          <p className="text-xs text-secondary-500 break-all">{u.email}</p>
          <p className="text-xs text-secondary-500">
            {u.roles.join(', ') || 'sin rol'} · {u.propiedades_publicadas} publicadas · Registro: {fecha(u.fecha_registro)} · Último acceso: {fechaHora(u.ultimo_acceso)}
          </p>
        </div>
        <BadgeEstado estados={ESTADOS_CUENTA} estado={u.estado} />
      </div>

      {u.reportes_abiertos > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-danger-700">
            <Flag size={14} aria-hidden="true" />
            {u.reportes_abiertos} {u.reportes_abiertos === 1 ? 'reporte abierto' : 'reportes abiertos'}
          </p>
          <ChipsMotivos motivos={u.motivos} />
          <ListaReportes reportes={u.reportes} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {u.reportes_abiertos > 0 && (
          <Button size="sm" onClick={() => onAccion('aprobar', u)}><CheckCircle2 size={14} aria-hidden="true" /> Aprobar</Button>
        )}
        {u.estado === 'suspendido' ? (
          <Button size="sm" onClick={() => onAccion('reactivar', u)}><RotateCcw size={14} aria-hidden="true" /> Reactivar</Button>
        ) : !esAdmin && !esYo && (
          <Button size="sm" variant="secondary" className="text-danger-700" onClick={() => onAccion('suspender', u)}>
            <Ban size={14} aria-hidden="true" /> Suspender
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function UsuariosModeracion() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const vista = VISTAS.some((v) => v.valor === params.get('vista')) ? params.get('vista') : 'reportados';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [busqueda, setBusqueda] = useState(q);
  useEffect(() => setBusqueda(q), [q]);

  const { data, isPending, isError, refetch, isFetching } = useUsuariosAdmin({ ...FILTROS_VISTA[vista], q: q || undefined, page, pageSize: PAGE_SIZE });
  const ejecutar = useEjecutarAccion();
  const { abrir, dialogo } = useDialogoModeracion();

  const cambiar = (cambios) => setParams((actual) => {
    const nuevo = new URLSearchParams(actual);
    Object.entries(cambios).forEach(([k, v]) => (v ? nuevo.set(k, v) : nuevo.delete(k)));
    return nuevo;
  }, { replace: true });

  const onAccion = (accion, u) => abrir(
    { ...ACCION[accion](u), objetivo: `${u.nombre} ${u.apellido} · ${u.email}` },
    (motivo) => ejecutar.mutateAsync({ accion, usuario_id: u.id, motivo }),
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section aria-labelledby="titulo-usuarios" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-usuarios" className="text-lg font-semibold text-secondary-900">Usuarios</h2>
        <Filtros etiqueta="Usuarios" opciones={VISTAS} valor={vista} onCambiar={(v) => cambiar({ vista: v === 'reportados' ? null : v, page: null })} />
      </div>

      <form role="search" onSubmit={(e) => { e.preventDefault(); cambiar({ q: busqueda.trim() || null, page: null }); }} className="flex gap-2">
        <Input
          id="buscar-usuario" aria-label="Buscar por nombre o correo" placeholder="Buscar por nombre o correo"
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="flex-1"
        />
        <Button type="submit" variant="secondary"><Search size={16} aria-hidden="true" /> Buscar</Button>
      </form>

      {isPending ? <div className="flex justify-center py-12"><Spinner /></div>
        : isError ? <EmptyState title="No se pudieron cargar los usuarios" action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>} />
        : data.data.length === 0 ? (
          <EmptyState
            icon={Users}
            title={q ? `Sin resultados para "${q}"` : vista === 'reportados' ? 'No hay usuarios reportados' : vista === 'suspendidos' ? 'No hay cuentas suspendidas' : 'No hay usuarios'}
          />
        ) : (
          <>
            <ul className={['space-y-3 transition-opacity', isFetching ? 'opacity-70' : ''].join(' ')}>
              {data.data.map((u) => <li key={u.id}><TarjetaUsuario u={u} esYo={u.id === user?.id} onAccion={onAccion} /></li>)}
            </ul>
            <Pagination page={page} totalPages={totalPages} onPageChange={(n) => cambiar({ page: n > 1 ? String(n) : null })} />
          </>
        )}
      {dialogo}
    </section>
  );
}
