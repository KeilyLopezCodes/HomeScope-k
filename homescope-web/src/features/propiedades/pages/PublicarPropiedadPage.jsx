import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import StepIndicator    from '../components/StepIndicator';
import StepDatosGenerales from '../components/StepDatosGenerales';
import StepFotos        from '../components/StepFotos';
import StepUbicacion    from '../components/StepUbicacion';
import StepConfirmacion from '../components/StepConfirmacion';
import { useBorradorPropiedad } from '../hooks/useBorradorPropiedad';
import { apiClient } from '../../../shared/api/client';
import { subirFotos } from '../services/fotosService';
import { useToast } from '../../../shared/components/ui';
import { Button, Card } from '../../../shared/components/ui';

const FIELDS_PER_STEP = [
  ['titulo', 'tipo_propiedad_id', 'modalidad', 'precio', 'moneda', 'descripcion'],
  ['fotos'],
  ['departamento', 'municipio', 'direccion'],
  [],
];

export default function PublicarPropiedadPage() {
  const [step, setStep]         = useState(0);
  const [borradorGuardado, setBorrador] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { guardar, cargar, limpiar } = useBorradorPropiedad();
  // Pasos ya completados en el servidor, para no duplicar la propiedad o las fotos al reintentar
  const progreso = useRef({ id: null, fotosSubidas: false });
  const navigate = useNavigate();
  const toast    = useToast();

  const {
    register, handleSubmit, trigger,
    setValue, getValues, reset,
    formState: { errors },
  } = useForm({ mode: 'onTouched' });

  // Restaurar borrador al montar
  useEffect(() => {
    const borrador = cargar();
    if (borrador) {
      // Borradores antiguos guardaban las fotos como URLs blob (ya inválidas): descartarlas
      const { _savedAt, paso_formulario, fotos, fotoPortada, ...data } = borrador;
      reset(data);
      if (paso_formulario) setStep(Math.min(paso_formulario - 1, 3));
      setBorrador(true);
    }
  }, []);

  async function handleNext() {
    const valid = await trigger(FIELDS_PER_STEP[step]);
    if (valid) setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  function handleGuardarBorrador() {
    // Los archivos de fotos no se pueden serializar en localStorage
    const { fotos, fotoPortada, ...valores } = getValues();
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
      // Las fotos se suben aparte como multipart
      const { fotos, fotoPortada, ...campos } = data;

      // 1. Crear la propiedad como borrador (si un intento anterior ya la creó, reutilizarla)
      if (!progreso.current.id) {
        const nueva = await apiClient('/api/v1/propiedades', {
          method: 'POST',
          body: JSON.stringify({ ...campos, paso_formulario: 4 }),
        });
        progreso.current.id = nueva.id;
      }
      const id = progreso.current.id;

      // 2. Subir las fotos en el orden elegido, indicando cuál es la portada
      if (!progreso.current.fotosSubidas) {
        const indicePortada = Math.max(0, fotos.findIndex((f) => f.key === fotoPortada));
        await subirFotos(id, fotos.map((f) => f.file), indicePortada);
        progreso.current.fotosSubidas = true;
      }

      // 3. Publicar (borrador → publicado)
      await apiClient(`/api/v1/propiedades/${id}/publicar`, {
        method: 'POST',
      });

      fotos.forEach((f) => URL.revokeObjectURL(f.preview));
      limpiar();
      toast('Propiedad publicada correctamente', 'success');
      navigate('/mis-propiedades');
    } catch (err) {
      toast(err?.message ?? 'Error al publicar la propiedad', 'error');
    } finally {
      setEnviando(false);
    }
  }

  const isLast = step === 3;

  return (
    <div className="min-h-screen bg-secondary-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-secondary-900">Publicar propiedad</h1>
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
            {step === 2 && <StepUbicacion register={register} errors={errors} />}
            {step === 3 && <StepConfirmacion getValues={getValues} />}
          </Card>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button type="button" variant="text" size="sm" onClick={handleGuardarBorrador}>
              Guardar borrador
            </Button>

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
                  Publicar propiedad
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
