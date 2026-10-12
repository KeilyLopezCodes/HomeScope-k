import { Input, Textarea, Select } from '../../../shared/components/ui';

export default function StepDatosGenerales({ register, errors }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-secondary-800">Datos generales</h2>

      <Input
        id="titulo"
        label="Título"
        required
        placeholder="Ej. Casa amplia en zona residencial"
        error={errors.titulo?.message}
        {...register('titulo', {
          required: 'El título es obligatorio',
          maxLength: { value: 150, message: 'Máximo 150 caracteres' },
        })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          id="tipo_propiedad_id"
          label="Tipo de propiedad"
          required
          error={errors.tipo_propiedad_id?.message}
          {...register('tipo_propiedad_id', { required: 'Selecciona un tipo' })}
        >
          <option value="">Seleccionar…</option>
          <option value="1">Casa</option>
          <option value="2">Apartamento</option>
          <option value="3">Terreno</option>
          <option value="4">Local comercial</option>
          <option value="5">Oficina</option>
        </Select>

        <Select
          id="modalidad"
          label="Modalidad"
          required
          error={errors.modalidad?.message}
          {...register('modalidad', { required: 'Selecciona una modalidad' })}
        >
          <option value="">Seleccionar…</option>
          <option value="venta">Venta</option>
          <option value="alquiler">Alquiler</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="precio"
          label="Precio"
          required
          type="number"
          min="0"
          placeholder="0.00"
          error={errors.precio?.message}
          {...register('precio', {
            required: 'El precio es obligatorio',
            min: { value: 1, message: 'Debe ser mayor a 0' },
          })}
        />

        <Select
          id="moneda"
          label="Moneda"
          required
          error={errors.moneda?.message}
          {...register('moneda', { required: 'Selecciona una moneda' })}
        >
          <option value="GTQ">GTQ — Quetzal</option>
          <option value="USD">USD — Dólar</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Input
          id="habitaciones"
          label="Habitaciones"
          type="number"
          min="0"
          placeholder="0"
          error={errors.habitaciones?.message}
          {...register('habitaciones', { min: { value: 0, message: 'Mínimo 0' } })}
        />
        <Input
          id="banos"
          label="Baños"
          type="number"
          min="0"
          step="0.5"
          placeholder="0"
          error={errors.banos?.message}
          {...register('banos', { min: { value: 0, message: 'Mínimo 0' } })}
        />
        <Input
          id="parqueos"
          label="Parqueos"
          type="number"
          min="0"
          placeholder="0"
          error={errors.parqueos?.message}
          {...register('parqueos', { min: { value: 0, message: 'Mínimo 0' } })}
        />
        <Input
          id="area_m2"
          label="Área (m²)"
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          error={errors.area_m2?.message}
          {...register('area_m2', { min: { value: 0, message: 'Mínimo 0' } })}
        />
      </div>

      <Textarea
        id="descripcion"
        label="Descripción"
        required
        placeholder="Describe la propiedad…"
        rows={4}
        error={errors.descripcion?.message}
        {...register('descripcion', {
          required: 'La descripción es obligatoria',
          minLength: { value: 20, message: 'Mínimo 20 caracteres' },
        })}
      />
    </div>
  );
}
