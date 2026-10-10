export default function StepUbicacion({ register, errors }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Ubicación</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Departamento *</label>
        <select
          {...register('departamento', { required: 'Selecciona un departamento' })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Seleccionar…</option>
          {[
            'Alta Verapaz','Baja Verapaz','Chimaltenango','Chiquimula','El Progreso',
            'Escuintla','Guatemala','Huehuetenango','Izabal','Jalapa','Jutiapa',
            'Petén','Quetzaltenango','Quiché','Retalhuleu','Sacatepéquez',
            'San Marcos','Santa Rosa','Sololá','Suchitepéquez','Totonicapán','Zacapa',
          ].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {errors.departamento && <p className="text-red-500 text-xs mt-1">{errors.departamento.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Municipio *</label>
        <input
          {...register('municipio', { required: 'El municipio es obligatorio' })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Ej. Jalapa"
        />
        {errors.municipio && <p className="text-red-500 text-xs mt-1">{errors.municipio.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Zona / Colonia</label>
        <input
          {...register('zona')}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Zona 1, Col. Las Flores…"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
        <input
          {...register('direccion', { required: 'La dirección es obligatoria' })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Calle, zona, colonia…"
        />
        {errors.direccion && <p className="text-red-500 text-xs mt-1">{errors.direccion.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
          <input
            type="number"
            step="any"
            {...register('latitud', {
              min: { value: -90, message: 'Valor inválido' },
              max: { value: 90, message: 'Valor inválido' },
            })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="15.7835"
          />
          {errors.latitud && <p className="text-red-500 text-xs mt-1">{errors.latitud.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
          <input
            type="number"
            step="any"
            {...register('longitud', {
              min: { value: -180, message: 'Valor inválido' },
              max: { value: 180, message: 'Valor inválido' },
            })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="-90.2308"
          />
          {errors.longitud && <p className="text-red-500 text-xs mt-1">{errors.longitud.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Referencias adicionales</label>
        <textarea
          rows={2}
          {...register('referencias')}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          placeholder="Frente al parque, a 2 cuadras del mercado…"
        />
      </div>
    </div>
  );
}
