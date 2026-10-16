import { Input, Textarea, Select } from '../../../shared/components/ui';
import { SelectorUbicacion } from '../../mapa';

const DEPARTAMENTOS = [
  'Alta Verapaz','Baja Verapaz','Chimaltenango','Chiquimula','El Progreso',
  'Escuintla','Guatemala','Huehuetenango','Izabal','Jalapa','Jutiapa',
  'Petén','Quetzaltenango','Quiché','Retalhuleu','Sacatepéquez',
  'San Marcos','Santa Rosa','Sololá','Suchitepéquez','Totonicapán','Zacapa',
];

const sinTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Google puede devolver "Sacatepequez" o "Departamento de Jalapa": se busca en la lista del select
const departamentoDeLista = (nombre) =>
  nombre ? DEPARTAMENTOS.find((d) => sinTildes(d) === sinTildes(nombre)) : undefined;

const OPCIONES_CAMPO = { shouldValidate: true, shouldDirty: true };

export default function StepUbicacion({ register, errors, setValue, watch }) {
  const [latitud, longitud, direccion, zona, municipio, departamento] =
    watch(['latitud', 'longitud', 'direccion', 'zona', 'municipio', 'departamento']);

  const lat = latitud === '' || latitud == null ? NaN : Number(latitud);
  const lng = longitud === '' || longitud == null ? NaN : Number(longitud);
  const posicion = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  function alPosicion({ lat, lng }) {
    setValue('latitud',  Number(lat.toFixed(6)), OPCIONES_CAMPO);
    setValue('longitud', Number(lng.toFixed(6)), OPCIONES_CAMPO);
  }

  // Solo se reemplazan los campos que la geocodificación sí trajo
  function alDireccion(datos) {
    if (datos.direccion) setValue('direccion', datos.direccion, OPCIONES_CAMPO);
    if (datos.zona)      setValue('zona', datos.zona, OPCIONES_CAMPO);
    if (datos.municipio) setValue('municipio', datos.municipio, OPCIONES_CAMPO);
    const depto = departamentoDeLista(datos.departamento);
    if (depto) setValue('departamento', depto, OPCIONES_CAMPO);
  }

  const direccionEscrita = [direccion, zona, municipio, departamento]
    .map((p) => p?.trim()).filter(Boolean).join(', ');

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-secondary-800">Ubicación</h2>

      <Select
        id="departamento"
        label="Departamento"
        required
        error={errors.departamento?.message}
        {...register('departamento', { required: 'Selecciona un departamento' })}
      >
        <option value="">Seleccionar…</option>
        {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
      </Select>

      <Input
        id="municipio"
        label="Municipio"
        required
        placeholder="Ej. Jalapa"
        error={errors.municipio?.message}
        {...register('municipio', { required: 'El municipio es obligatorio' })}
      />

      <Input
        id="zona"
        label="Zona / Colonia"
        placeholder="Zona 1, Col. Las Flores…"
        {...register('zona')}
      />

      <Input
        id="direccion"
        label="Dirección"
        required
        placeholder="Calle, zona, colonia…"
        error={errors.direccion?.message}
        {...register('direccion', { required: 'La dirección es obligatoria' })}
      />

      <SelectorUbicacion
        posicion={posicion}
        onPosicion={alPosicion}
        onDireccion={alDireccion}
        direccionEscrita={direccionEscrita && `${direccionEscrita}, Guatemala`}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="latitud"
          label="Latitud"
          type="number"
          step="any"
          placeholder="15.7835"
          error={errors.latitud?.message}
          {...register('latitud', {
            min: { value: -90, message: 'Valor inválido' },
            max: { value: 90, message: 'Valor inválido' },
          })}
        />
        <Input
          id="longitud"
          label="Longitud"
          type="number"
          step="any"
          placeholder="-90.2308"
          error={errors.longitud?.message}
          {...register('longitud', {
            min: { value: -180, message: 'Valor inválido' },
            max: { value: 180, message: 'Valor inválido' },
          })}
        />
      </div>

      <Textarea
        id="referencias"
        label="Referencias adicionales"
        placeholder="Frente al parque, a 2 cuadras del mercado…"
        rows={2}
        {...register('referencias')}
      />
    </div>
  );
}
