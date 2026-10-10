import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import StepIndicator from '../components/StepIndicator';
import StepDatosGenerales from '../components/StepDatosGenerales';
import StepFotos from '../components/StepFotos';
import StepUbicacion from '../components/StepUbicacion';
import StepConfirmacion from '../components/StepConfirmacion';
import { useBorradorPropiedad } from '../hooks/useBorradorPropiedad';

const FIELDS_PER_STEP = [
  ['titulo', 'tipo_propiedad_id', 'modalidad', 'precio', 'moneda', 'descripcion'],
  ['fotos'],
  ['departamento', 'municipio', 'direccion'],
  [],
];

export default function PublicarPropiedadPage() {
  const [step, setStep] = useState(0);
  const [borradorGuardado, setBorradorGuardado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { guardar, cargar, limpiar } = useBorradorPropiedad();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm({ mode: 'onTouched' });

  // Cargar borrador al montar
  useEffect(() => {
    const borrador = cargar();
    if (borrador) {
      const { _savedAt, ...data } = borrador;
      reset(data);
      setBorradorGuardado(true);
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
    guardar({ ...getValues(), paso_formulario: step + 1 });
    setBorradorGuardado(true);
  }

  async function onSubmit(data) {
    setEnviando(true);
    try {
      // TODO: llamar apiClient('/api/v1/propiedades', { method: 'POST', body: JSON.stringify(data) })
      console.log('Publicar propiedad:', data);
      limpiar();
      navigate('/propiedades');
    } catch (err) {
      console.error(err);
    } finally {
      setEnviando(false);
    }
  }

  const isLast = step === 3;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Publicar propiedad</h1>
          {borradorGuardado && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              Borrador guardado
            </span>
          )}
        </div>

        <StepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {step === 0 && <StepDatosGenerales register={register} errors={errors} />}
            {step === 1 && <StepFotos register={register} errors={errors} setValue={setValue} getValues={getValues} />}
            {step === 2 && <StepUbicacion register={register} errors={errors} />}
            {step === 3 && <StepConfirmacion getValues={getValues} />}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleGuardarBorrador}
              className="text-sm text-gray-500 hover:text-emerald-600 underline underline-offset-2 transition-colors"
            >
              Guardar borrador
            </button>

            <div className="flex gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Atrás
                </button>
              )}

              {!isLast ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={enviando}
                  className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
                >
                  {enviando ? 'Publicando…' : 'Publicar propiedad'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
