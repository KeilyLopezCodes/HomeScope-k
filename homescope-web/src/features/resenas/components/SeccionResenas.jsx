import { Link } from 'react-router-dom';
import { Spinner } from '../../../shared/components/ui';
import ResumenCalificacion from './ResumenCalificacion';
import ListaResenas from './ListaResenas';
import FormularioResena from './FormularioResena';
import { usePerfilVendedor } from '../hooks/useResenas';

// Sección de la ficha: calificación del vendedor, el formulario (si corresponde) y sus reseñas más recientes
export default function SeccionResenas({ propiedad }) {
  const vendedorId = propiedad.vendedor.id;
  const { data: perfil, isPending } = usePerfilVendedor(vendedorId);

  return (
    <div className="space-y-5">
      {isPending ? <Spinner label="Cargando calificación…" className="py-6" /> : perfil && (
        <ResumenCalificacion calificacion={perfil.calificacion} compacto />
      )}

      <FormularioResena propiedad={propiedad} />

      <ListaResenas vendedorId={vendedorId} propiedadActual={propiedad.id} pageSize={3} />

      {perfil?.calificacion.total > 0 && (
        <Link to={`/vendedores/${vendedorId}`} className="inline-block text-sm font-medium text-primary-600 hover:underline">
          Ver el perfil de {perfil.nombre} y todas sus reseñas
        </Link>
      )}
    </div>
  );
}
