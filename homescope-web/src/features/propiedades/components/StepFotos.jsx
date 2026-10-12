import { useState, useEffect } from 'react';
import { ImagePlus, X } from 'lucide-react';

export default function StepFotos({ setValue, getValues, errors, register }) {
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const saved = getValues('fotos');
    if (saved?.length) setPreviews(saved);
  }, []);

  function handleFiles(e) {
    const files = Array.from(e.target.files);
    const urls = files.map((f) => URL.createObjectURL(f));
    const next = [...previews, ...urls].slice(0, 10);
    setPreviews(next);
    setValue('fotos', next, { shouldValidate: true });
  }

  function removePhoto(idx) {
    const next = previews.filter((_, i) => i !== idx);
    setPreviews(next);
    setValue('fotos', next, { shouldValidate: true });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-secondary-800">Fotos</h2>
      <p className="text-sm text-secondary-500">Agrega al menos 1 foto. Máximo 10.</p>

      {/* campo oculto para validación RHF */}
      <input
        type="hidden"
        {...register('fotos', {
          validate: (v) => v?.length > 0 || 'Agrega al menos una foto',
        })}
      />

      <label
        htmlFor="fotos-input"
        className={[
          'flex flex-col items-center justify-center w-full h-32 rounded border-2 border-dashed cursor-pointer transition-colors',
          errors.fotos
            ? 'border-danger-500 bg-danger-50'
            : 'border-secondary-300 hover:border-primary-500 hover:bg-primary-50',
        ].join(' ')}
      >
        <ImagePlus size={24} className="text-secondary-400 mb-1" />
        <span className="text-sm text-secondary-500">Haz clic para seleccionar imágenes</span>
        <input
          id="fotos-input"
          type="file"
          multiple
          accept="image/*"
          className="sr-only"
          onChange={handleFiles}
          aria-describedby={errors.fotos ? 'fotos-error' : undefined}
        />
      </label>

      {errors.fotos && (
        <p id="fotos-error" className="text-xs text-danger-600">{errors.fotos.message}</p>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative group aspect-square">
              <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover rounded" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label={`Eliminar foto ${i + 1}`}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X size={10} />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-primary-600 text-white text-xs px-1 rounded">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
