import { useState, useEffect } from 'react';
import { ImagePlus, X, Star, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { FOTOS_CONFIG, validarArchivo } from '../services/fotosService';

// Valor del formulario:
//   fotos           → [{ key, file, preview }] en el orden en que se mostrarán; las que ya están en el
//                     servidor (borrador o edición) llegan como { key, id, preview: url } sin archivo
//   fotoPortada     → key de la foto elegida como portada
//   fotosEliminadas → ids de fotos del servidor que se quitaron (se borran al guardar)
export default function StepFotos({ setValue, getValues, errors, register }) {
  const [fotos, setFotos]       = useState(() => getValues('fotos') ?? []);
  const [portada, setPortada]   = useState(() => getValues('fotoPortada') ?? null);
  const [rechazos, setRechazos] = useState([]);
  const [arrastrando, setArrastrando] = useState(null);

  // Campo personalizado (sin input nativo): se registra solo para la validación de RHF
  useEffect(() => {
    register('fotos', { validate: (v) => v?.length > 0 || 'Agrega al menos una foto' });
  }, [register]);

  function actualizar(nuevas, nuevaPortada = portada) {
    // Si la portada ya no existe, pasa a ser la primera foto
    const portadaFinal = nuevas.some((f) => f.key === nuevaPortada) ? nuevaPortada : (nuevas[0]?.key ?? null);
    setFotos(nuevas);
    setPortada(portadaFinal);
    setValue('fotos', nuevas, { shouldValidate: true });
    setValue('fotoPortada', portadaFinal);
  }

  function handleFiles(e) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = ''; // permite volver a elegir el mismo archivo

    const errores = [];
    const validas = [];
    for (const file of archivos) {
      const error = validarArchivo(file);
      if (error) errores.push(error);
      else validas.push(file);
    }

    const espacio = FOTOS_CONFIG.maxPorPropiedad - fotos.length;
    if (validas.length > espacio)
      errores.push(`Solo se agregaron ${Math.max(espacio, 0)} foto(s): el máximo es ${FOTOS_CONFIG.maxPorPropiedad}.`);

    const nuevas = validas.slice(0, Math.max(espacio, 0)).map((file) => ({
      key:     crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setRechazos(errores);
    if (nuevas.length) actualizar([...fotos, ...nuevas]);
  }

  function eliminar(key) {
    const foto = fotos.find((f) => f.key === key);
    if (foto?.id) setValue('fotosEliminadas', [...(getValues('fotosEliminadas') ?? []), foto.id]);
    else if (foto) URL.revokeObjectURL(foto.preview);
    actualizar(fotos.filter((f) => f.key !== key));
  }

  function mover(desde, hasta) {
    if (hasta < 0 || hasta >= fotos.length || desde === hasta) return;
    const nuevas = [...fotos];
    const [foto] = nuevas.splice(desde, 1);
    nuevas.splice(hasta, 0, foto);
    actualizar(nuevas);
  }

  function handleDrop(indiceDestino) {
    if (arrastrando !== null) mover(arrastrando, indiceDestino);
    setArrastrando(null);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-secondary-800">Fotos</h2>
      <p className="text-sm text-secondary-500">
        Agrega entre 1 y {FOTOS_CONFIG.maxPorPropiedad} fotos (JPG, PNG o WEBP, máximo{' '}
        {FOTOS_CONFIG.maxBytes / (1024 * 1024)} MB cada una). Arrástralas para cambiar el orden y
        marca con la estrella la foto de portada.
      </p>

      <label
        htmlFor="fotos-input"
        className={[
          'flex flex-col items-center justify-center w-full h-32 rounded border-2 border-dashed transition-colors',
          fotos.length >= FOTOS_CONFIG.maxPorPropiedad
            ? 'border-secondary-200 bg-secondary-50 cursor-not-allowed opacity-60'
            : errors.fotos
              ? 'border-danger-500 bg-danger-50 cursor-pointer'
              : 'border-secondary-300 hover:border-primary-500 hover:bg-primary-50 cursor-pointer',
        ].join(' ')}
      >
        <ImagePlus size={24} className="text-secondary-400 mb-1" />
        <span className="text-sm text-secondary-500">
          Haz clic para seleccionar imágenes ({fotos.length}/{FOTOS_CONFIG.maxPorPropiedad})
        </span>
        <input
          id="fotos-input"
          type="file"
          multiple
          accept={FOTOS_CONFIG.tipos.join(',')}
          className="sr-only"
          onChange={handleFiles}
          disabled={fotos.length >= FOTOS_CONFIG.maxPorPropiedad}
          aria-describedby={errors.fotos ? 'fotos-error' : undefined}
        />
      </label>

      {errors.fotos && (
        <p id="fotos-error" className="text-xs text-danger-600">{errors.fotos.message}</p>
      )}

      {rechazos.length > 0 && (
        <ul className="text-xs text-danger-600 space-y-0.5" role="alert">
          {rechazos.map((msg) => <li key={msg}>{msg}</li>)}
        </ul>
      )}

      {fotos.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {fotos.map((foto, i) => {
            const esPortada = foto.key === portada;
            return (
              <li
                key={foto.key}
                draggable
                onDragStart={() => setArrastrando(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => setArrastrando(null)}
                className={[
                  'relative group aspect-square rounded overflow-hidden border-2 bg-secondary-100 cursor-move',
                  esPortada ? 'border-primary-600' : 'border-transparent',
                  arrastrando === i ? 'opacity-40' : '',
                ].join(' ')}
              >
                <img src={foto.preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover pointer-events-none" />

                <span className="absolute top-1 left-1 bg-black/60 text-white text-xs rounded px-1 flex items-center gap-0.5">
                  <GripVertical size={10} /> {i + 1}
                </span>

                <button
                  type="button"
                  onClick={() => eliminar(foto.key)}
                  aria-label={`Eliminar foto ${i + 1}`}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <X size={12} />
                </button>

                <div className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-1 p-1 bg-gradient-to-t from-black/70 to-transparent">
                  <button
                    type="button"
                    onClick={() => mover(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Mover foto ${i + 1} a la izquierda`}
                    className="text-white p-0.5 rounded hover:bg-white/20 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => actualizar(fotos, foto.key)}
                    aria-pressed={esPortada}
                    aria-label={esPortada ? 'Foto de portada' : `Usar foto ${i + 1} como portada`}
                    className={[
                      'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
                      esPortada ? 'bg-primary-600 text-white' : 'text-white hover:bg-white/20',
                    ].join(' ')}
                  >
                    <Star size={12} fill={esPortada ? 'currentColor' : 'none'} />
                    Portada
                  </button>

                  <button
                    type="button"
                    onClick={() => mover(i, i + 1)}
                    disabled={i === fotos.length - 1}
                    aria-label={`Mover foto ${i + 1} a la derecha`}
                    className="text-white p-0.5 rounded hover:bg-white/20 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
