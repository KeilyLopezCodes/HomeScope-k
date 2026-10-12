import { Card, Badge } from '../../../shared/components/ui';

const TIPO_LABEL = { 1: 'Casa', 2: 'Apartamento', 3: 'Terreno', 4: 'Local comercial', 5: 'Oficina' };

function Row({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between py-2 border-b border-secondary-100 text-sm last:border-0">
      <span className="text-secondary-500">{label}</span>
      <span className="font-medium text-secondary-800 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function StepConfirmacion({ getValues }) {
  const v = getValues();
  const fotos = v.fotos ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-secondary-800">Confirmación</h2>
      <p className="text-sm text-secondary-500">Revisa los datos antes de publicar.</p>

      <Card className="p-4">
        <Row label="Título" value={v.titulo} />
        <Row label="Tipo" value={TIPO_LABEL[v.tipo_propiedad_id]} />
        <Row
          label="Modalidad"
          value={
            v.modalidad ? (
              <Badge variant={v.modalidad === 'venta' ? 'primary' : 'success'}>
                {v.modalidad === 'venta' ? 'Venta' : 'Alquiler'}
              </Badge>
            ) : null
          }
        />
        <Row
          label="Precio"
          value={v.precio ? `${v.moneda ?? 'GTQ'} ${Number(v.precio).toLocaleString('es-GT')}` : null}
        />
        <Row label="Habitaciones" value={v.habitaciones || null} />
        <Row label="Baños" value={v.banos || null} />
        <Row label="Parqueos" value={v.parqueos || null} />
        <Row label="Área" value={v.area_m2 ? `${v.area_m2} m²` : null} />
        <Row label="Departamento" value={v.departamento} />
        <Row label="Municipio" value={v.municipio} />
        <Row label="Zona" value={v.zona} />
        <Row label="Dirección" value={v.direccion} />
        <Row label="Descripción" value={v.descripcion} />
      </Card>

      {fotos.length > 0 && (
        <div>
          <p className="text-sm text-secondary-500 mb-2">{fotos.length} foto(s)</p>
          <div className="flex gap-2 flex-wrap">
            {fotos.slice(0, 5).map((src, i) => (
              <img key={i} src={src} alt={`Foto ${i + 1}`} className="w-16 h-16 object-cover rounded" />
            ))}
            {fotos.length > 5 && (
              <div className="w-16 h-16 bg-secondary-100 rounded flex items-center justify-center text-xs text-secondary-500">
                +{fotos.length - 5}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
