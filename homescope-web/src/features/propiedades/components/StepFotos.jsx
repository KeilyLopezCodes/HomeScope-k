import { useState, useEffect } from 'react';

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
      <h2 className="text-lg font-semibold text-gray-800">Fotos</h2>
      <p className="text-sm text-gray-500">Agrega al menos 1 foto. Máximo 10.</p>

      {/* hidden register for validation */}
      <input type="hidden" {...register('fotos', { validate: (v) => (v?.length > 0) || 'Agrega al menos una foto' })} />

      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
        <span className="text-sm text-gray-500">Haz clic para seleccionar imágenes</span>
        <input type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />
      </label>

      {errors.fotos && <p className="text-red-500 text-xs">{errors.fotos.message}</p>}

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative group aspect-square">
              <img src={src} alt="" className="w-full h-full object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-xs px-1 rounded">Principal</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
