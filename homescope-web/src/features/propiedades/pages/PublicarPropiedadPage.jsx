import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import StepIndicator    from '../components/StepIndicator';
import StepDatosGenerales from '../components/StepDatosGenerales';
import StepFotos        from '../components/StepFotos';
import StepUbicacion    from '../components/StepUbicacion';
import StepConfirmacion from '../components/StepConfirmacion';
import { useBorradorPropiedad } from '../hooks/useBorradorPropiedad';
import { usePropiedad } from '../hooks/usePropiedad';
import { useAuth } from '../../auth';
import { sincronizarFotos } from '../services/fotosService';
import { crearPropiedad, actualizarPropiedad, publicarPropiedad } from '../services/propiedadesService';
import { useToast } from '../../../shared/components/ui';
import { Button, Card, Spinner } from '../../../shared/components/ui';

const FIELDS_PER_STEP = [
  ['titulo', 'tipo_propiedad_id', 'modalidad', 'precio', 'moneda', 'descripcion'],
  ['fotos'],
  ['departamento', 'municipio', 'direccion'],
  [],
];

const CAMPOS_FORMULARIO = [
  'titulo', 'tipo_propiedad_id', 'modalidad', 'precio', 'moneda', 'descripcion',
  'habitaciones', 'banos', 'parqueos', 'area_m2',
  'departamento', 'municipio', 'zona', 'direccion', 'latitud', 'longitud',
];
// Campos que el backend acepta en null: vaciarlos en el formulario los borra
const CAMPOS_ANULABLES = ['habitaciones', 'banos', 'area_m2', 'parqueos', 'zona', 'municipio', 'departamento', 'latitud', 'longitud'];

// Valores del formulario → cuerpo para POST/PUT /propiedades (sin las fotos, que se envían aparte)
function prepararCampos(valores) {
  return Object.fromEntries(
    CAMPOS_FORMULARIO
      .map((campo) => {
        const v = valores[campo];
        const vacio = v === '' || v === null || v === undefined;
        return [campo, vacio ? (CAMPOS_ANULABLES.includes(campo) ? null : undefined) : v];
      })
      .filter(([, v]) => v !== undefined)
  );
}

// Propiedad del servidor → valores del formulario
function valoresDesdePropiedad(p) {
  const valores = Object.fromEntries(CAMPOS_FORMULARIO.map((campo) => [campo, p[campo] ?? '']));
  valores.tipo_propiedad_id = p.tipo_propiedad ? String(p.tipo_propiedad.id) : '';
  valores.fotos = p.fotos.map((f) => ({ key: `servidor-${f.id}`, id: f.id, preview: f.url }));
  const portada = p.fotos.find((f) => f.es_portada) ?? p.fotos[0];
  valores.fotoPortada = portada ? `servidor-${portada.id}` : null;
  valores.fotosEliminadas = [];
  return valores;
}

const TITULOS = {
  nueva:    'Publicar propiedad',
  borrador: 'Continuar borrador',
  editar:   'Editar propiedad',
};

// Tres usos del mismo formulario:
//   /publicar                    → propiedad nueva; "Guardar borrador" la guarda en este navegador
//   /publicar?borrador=:id       → continúa un borrador del servidor en el paso donde quedó
//   /mis-propiedades/:id/editar  → edita una propiedad existente (modo="editar")
export default function PublicarPropiedadPage({ modo: modoRuta = 'publicar' }) {
  const { id: idRuta } = useParams();
  const [searchParams] = useSearchParams();
  const idBorrador = searchParams.get('borrador');
  const modo = modoRuta === 'editar' ? 'editar' : idBorrador ? 'borrador' : 'nueva';
  const propiedadId = modo === 'editar' ? idRuta : modo === 'borrador' ? idBorrador : null;

  const [step, setStep]         = useState(0);
  const [borradorGuardado, setBorrador] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const { guardar, cargar, limpiar } = useBorradorPropiedad();
  // Id de la propiedad en el servidor: la que se continúa o edita, o la creada en un intento anterior
  // (así reintentar no la duplica)
  const progreso = useRef({ id: propiedadId });
  const cargada  = useRef(false);
  const navigate = useNavigate();
  const toast    = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const propiedad = usePropiedad(propiedadId, { usuarioId: user?.id, enabled: Boolean(propiedadId) });

  const {
    register, handleSubmit, trigger,
    setValue, getValues, reset, watch,
    formState: { errors },
  } = useForm({ mode: 'onTouched' });

  // Propiedad nueva: restaurar el borrador guardado en este navegador
  useEffect(() => {
    if (propiedadId) return;
    const borrador = cargar();
    if (borrador) {
      // Borradores antiguos guardaban las fotos como URLs blob (ya inválidas): descartarlas
      const { _savedAt, paso_formulario, fotos, fotoPortada, ...data } = borrador;
      reset(data);
      if (paso_formulario) setStep(Math.min(paso_formulario - 1, 3));
      setBorrador(true);
    }
  }, []);

  // Borrador del servidor o edición: llenar el formulario una sola vez con la propiedad
  useEffect(() => {
    const p = propiedad.data;
    if (!p || cargada.current || !p.es_dueno) return;
    if (modo === 'borrador' && p.estado !== 'borrador') return;
    if (modo === 'editar' && ['vendido', 'alquilado'].includes(p.estado)) return;
    cargada.current = true;
    reset(valoresDesdePropiedad(p));
    if (modo === 'borrador') setStep(Math.min(Math.max((p.paso_formulario ?? 1) - 1, 0), 3));
  }, [propiedad.data]);

  async function handleNext() {
    const valid = await trigger(FIELDS_PER_STEP[step]);
    if (valid) setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  // Sube los cambios de fotos y deja en el formulario las fotos ya guardadas,
  // para no volver a subirlas si el paso siguiente falla y se reintenta
  async function guardarFotos(id) {
    const { fotos = [], fotoPortada, fotosEliminadas = [] } = getValues();
    const guardadas = await sincronizarFotos(id, fotos, fotoPortada, fotosEliminadas);
    fotos.filter((f) => !f.id).forEach((f) => URL.revokeObjectURL(f.preview));
    setValue('fotos', guardadas);
    setValue('fotosEliminadas', []);
  }

  async function handleGuardarBorrador() {
    // Borrador del servidor: se guarda allá con el paso actual, para continuarlo desde "Mis propiedades"
    if (modo === 'borrador') {
      setGuardandoBorrador(true);
      try {
        await actualizarPropiedad(propiedadId, { ...prepararCampos(getValues()), paso_formulario: step + 1 });
        await guardarFotos(propiedadId);
        queryClient.invalidateQueries({ queryKey: ['propiedades'] });
        setBorrador(true);
        toast('Borrador guardado', 'success');
      } catch (err) {
        toast(err?.message ?? 'No se pudo guardar el borrador', 'error');
      } finally {
        setGuardandoBorrador(false);
      }
      return;
    }

    // Los archivos de fotos no se pueden serializar en localStorage
    const { fotos, fotoPortada, fotosEliminadas, ...valores } = getValues();
    guardar({ ...valores, paso_formulario: step + 1 });
    setBorrador(true);
    toast('Borrador guardado', 'success');
  }

  async function onSubmit(data) {
    // Las fotos no se guardan en el borrador local (son archivos): si se restauró un borrador, pedirlas de nuevo
    if (!data.fotos?.length) {
      setStep(1);
      toast('Agrega al menos una foto antes de publicar', 'error');
      return;
    }

    setEnviando(true);
    try {
      const campos = prepararCampos(data);

      // 1. Guardar los datos: crear la propiedad como borrador, o actualizar la existente
      if (!progreso.current.id) {
        const nueva = await crearPropiedad({ ...campos, paso_formulario: 4 });
        progreso.current.id = nueva.id;
      } else {
        await actualizarPropiedad(progreso.current.id, modo === 'editar' ? campos : { ...campos, paso_formulario: 4 });
      }
      const id = progreso.current.id;

      // 2. Fotos: subir las nuevas, quitar las eliminadas, aplicar el orden y la portada
      await guardarFotos(id);

      // 3. Publicar (borrador → publicado); al editar, la propiedad conserva su estado
      if (modo !== 'editar') await publicarPropiedad(id);

      if (modo === 'nueva') limpiar();
      queryClient.invalidateQueries({ queryKey: ['propiedades'] });
      toast(modo === 'editar' ? 'Cambios guardados' : 'Propiedad publicada correctamente', 'success');
      navigate('/mis-propiedades');
    } catch (err) {
      toast(err?.message ?? (modo === 'editar' ? 'No se pudieron guardar los cambios' : 'Error al publicar la propiedad'), 'error');
    } finally {
      setEnviando(false);
    }
  }

  // ── Carga de la propiedad que se continúa o edita ──────────────────────────
  if (propiedadId) {
    const p = propiedad.data;
    if (propiedad.isLoading) return (
      <div className="flex justify-center py-24"><Spinner /></div>
    );
    if (propiedad.isError) return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <p className="text-secondary-700 mb-4">
          {propiedad.error?.status === 404 ? 'La propiedad no existe.' : 'No se pudo cargar la propiedad.'}
        </p>
        <Button variant="secondary" onClick={() => navigate('/mis-propiedades')}>Volver a mis propiedades</Button>
      </div>
    );
    if (p && !p.es_dueno) return <Navigate to="/403" replace />;
    // Un borrador que ya se publicó se edita; una propiedad vendida o alquilada ya no se puede editar
    if (p && modo === 'borrador' && p.estado !== 'borrador')
      return <Navigate to={`/mis-propiedades/${p.id}/editar`} replace />;
    if (p && modo === 'editar' && ['vendido', 'alquilado'].includes(p.estado)) return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <p className="text-secondary-700 mb-4">Esta propiedad ya está {p.estado === 'vendido' ? 'vendida' : 'alquilada'} y no se puede editar.</p>
        <Button variant="secondary" onClick={() => navigate('/mis-propiedades')}>Volver a mis propiedades</Button>
      </div>
    );
  }

  const isLast = step === 3;

  return (
    <div className="min-h-screen bg-secondary-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-secondary-900">{TITULOS[modo]}</h1>
          {borradorGuardado && (
            <span className="text-xs text-success-700 bg-success-50 border border-success-200 px-2 py-1 rounded-full">
              Borrador guardado
            </span>
          )}
        </div>

        <StepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Card className="p-6">
            {step === 0 && <StepDatosGenerales register={register} errors={errors} />}
            {step === 1 && (
              <StepFotos
                register={register}
                errors={errors}
                setValue={setValue}
                getValues={getValues}
              />
            )}
            {step === 2 && (
              <StepUbicacion register={register} errors={errors} setValue={setValue} watch={watch} />
            )}
            {step === 3 && <StepConfirmacion getValues={getValues} />}
          </Card>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {modo === 'editar' ? (
              <Button type="button" variant="text" size="sm" onClick={() => navigate('/mis-propiedades')}>
                Cancelar
              </Button>
            ) : (
              <Button type="button" variant="text" size="sm" onClick={handleGuardarBorrador} loading={guardandoBorrador}>
                Guardar borrador
              </Button>
            )}

            <div className="flex gap-3">
              {step > 0 && (
                <Button type="button" variant="secondary" onClick={handleBack}>
                  Atrás
                </Button>
              )}
              {!isLast ? (
                <Button type="button" variant="primary" onClick={handleNext}>
                  Siguiente
                </Button>
              ) : (
                <Button type="submit" variant="primary" loading={enviando}>
                  {modo === 'editar' ? 'Guardar cambios' : 'Publicar propiedad'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
