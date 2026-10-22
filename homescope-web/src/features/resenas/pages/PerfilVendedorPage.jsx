import { useParams } from 'react-router-dom';
import { AlertCircle, BadgeCheck, Building2, CalendarDays } from 'lucide-react';
import { Badge, Button, EmptyState, Spinner } from '../../../shared/components/ui';
import NotFoundPage from '../../../shared/pages/NotFoundPage';
import ResumenCalificacion from '../components/ResumenCalificacion';
import ListaResenas from '../components/ListaResenas';
import PropiedadesDelVendedor from '../components/PropiedadesDelVendedor';
import { usePerfilVendedor } from '../hooks/useResenas';
import { mesYAnio } from '../utils/fechas';

// /vendedores/:id — perfil público: datos básicos (sin contacto, RNF-08), sus propiedades publicadas,
// calificación promedio y reseñas
export default function PerfilVendedorPage() {
  const { id } = useParams();
  const idValido = /^\d+$/.test(id);
  const { data: perfil, isPending, isError, error, refetch } = usePerfilVendedor(idValido ? id : null);

  if (!idValido || [400, 404].includes(error?.status)) return <NotFoundPage />;
  if (isPending) return <Spinner size="lg" label="Cargando perfil…" className="py-32" />;
  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="No se pudo cargar el perfil"
        description={error?.message}
        action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}
      />
    );
  }

  const nombre = [perfil.nombre, perfil.apellido].filter(Boolean).join(' ');
  const iniciales = [perfil.nombre, perfil.apellido].map((p) => p?.[0] ?? '').join('').toUpperCase();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 rounded-lg border border-secondary-200 bg-white p-5 sm:flex-row sm:items-center">
        {perfil.foto_url ? (
          <img src={perfil.foto_url} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-semibold text-primary-700">
            {iniciales}
          </span>
        )}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-secondary-900">{nombre}</h1>
            {perfil.verificado && <Badge variant="verificado"><BadgeCheck size={12} aria-hidden="true" /> Vendedor verificado</Badge>}
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-secondary-500">
            <span className="flex items-center gap-1"><CalendarDays size={14} aria-hidden="true" /> En HomeScope desde {mesYAnio(perfil.miembro_desde)}</span>
            <span className="flex items-center gap-1">
              <Building2 size={14} aria-hidden="true" /> {perfil.propiedades_publicadas} {perfil.propiedades_publicadas === 1 ? 'propiedad publicada' : 'propiedades publicadas'}
            </span>
          </p>
        </div>
      </header>

      <PropiedadesDelVendedor vendedorId={perfil.id} nombre={perfil.nombre} />

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <section aria-labelledby="titulo-calificacion" className="h-fit rounded-lg border border-secondary-200 bg-white p-5 lg:sticky lg:top-20">
          <h2 id="titulo-calificacion" className="mb-4 text-base font-semibold text-secondary-900">Calificación</h2>
          <ResumenCalificacion calificacion={perfil.calificacion} />
        </section>

        <section aria-labelledby="titulo-resenas" className="rounded-lg border border-secondary-200 bg-white p-5">
          <h2 id="titulo-resenas" className="mb-4 text-base font-semibold text-secondary-900">
            Reseñas {perfil.calificacion.total > 0 && <span className="font-normal text-secondary-500">({perfil.calificacion.total})</span>}
          </h2>
          {perfil.calificacion.total > 0
            ? <ListaResenas vendedorId={perfil.id} pageSize={10} />
            : <p className="text-sm text-secondary-500">Cuando los compradores que lo contacten o visiten sus propiedades lo califiquen, sus reseñas aparecerán aquí.</p>}
        </section>
      </div>
    </div>
  );
}
