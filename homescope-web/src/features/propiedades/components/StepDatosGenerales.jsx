export default function StepDatosGenerales({ register, errors }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Datos generales</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
        <input
          {...register('titulo', { required: 'El título es obligatorio', maxLength: { value: 100, message: 'Máximo 100 caracteres' } })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Ej. Casa amplia en zona residencial"
        />
        {errors.titulo && <p className="text-red-500 text-xs mt-1">{errors.titulo.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
          <select
            {...register('tipo_propiedad_id', { required: 'Selecciona un tipo' })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Seleccionar…</option>
            <option value="1">Casa</option>
            <option value="2">Apartamento</option>
            <option value="3">Terreno</option>
            <option value="4">Local comercial</option>
            <option value="5">Oficina</option>
          </select>
          {errors.tipo_propiedad_id && <p className="text-red-500 text-xs mt-1">{errors.tipo_propiedad_id.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad *</label>
          <select
            {...register('modalidad', { required: 'Selecciona una modalidad' })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Seleccionar…</option>
            <option value="venta">Venta</option>
            <option value="alquiler">Alquiler</option>
          </select>
          {errors.modalidad && <p className="text-red-500 text-xs mt-1">{errors.modalidad.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Precio (GTQ) *</label>
        <input
          type="number"
          min="0"
          {...register('precio', { required: 'El precio es obligatorio', min: { value: 1, message: 'Debe ser mayor a 0' } })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="0.00"
        />
        {errors.precio && <p className="text-red-500 text-xs mt-1">{errors.precio.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Moneda *</label>
          <select
            {...register('moneda', { required: 'Selecciona una moneda' })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="GTQ">GTQ — Quetzal</option>
            <option value="USD">USD — Dólar</option>
          </select>
          {errors.moneda && <p className="text-red-500 text-xs mt-1">{errors.moneda.message}</p>}
        </div>
        <div />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Habitaciones</label>
          <input
            type="number"
            min="0"
            {...register('habitaciones', { min: { value: 0, message: 'Mínimo 0' } })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Baños</label>
          <input
            type="number"
            min="0"
            step="0.5"
            {...register('banos', { min: { value: 0, message: 'Mínimo 0' } })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parqueos</label>
          <input
            type="number"
            min="0"
            {...register('parqueos', { min: { value: 0, message: 'Mínimo 0' } })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Área (m²)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            {...register('area_m2', { min: { value: 0, message: 'Mínimo 0' } })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
        <textarea
          rows={4}
          {...register('descripcion', { required: 'La descripción es obligatoria', minLength: { value: 20, message: 'Mínimo 20 caracteres' } })}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          placeholder="Describe la propiedad…"
        />
        {errors.descripcion && <p className="text-red-500 text-xs mt-1">{errors.descripcion.message}</p>}
      </div>
    </div>
  );
}
