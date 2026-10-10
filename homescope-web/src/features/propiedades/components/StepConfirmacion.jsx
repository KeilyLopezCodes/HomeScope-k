const TIPO_LABEL = { 1: 'Casa', 2: 'Apartamento', 3: 'Terreno', 4: 'Local comercial', 5: 'Oficina' };
const MODALIDAD_LABEL = { venta: 'Venta', alquiler: 'Alquiler' };

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 text-right max-w-xs">{value}</span>
    </div>
  );
}

export default function StepConfirmacion({ getValues }) {
  const v = getValues();
  const fotos = v.fotos ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Confirmación</h2>
      <p className="text-sm text-gray-500">Revisa los datos antes de publicar.</p>

      <div className="bg-gray-50 rounded-lg p-4 space-y-0">
        <Row label="Título" value={v.titulo} />
        <Row label="Tipo" value={TIPO_LABEL[v.tipo_propiedad_id]} />
        <Row label="Modalidad" value={MODALIDAD_LABEL[v.modalidad]} />
        <Row label="Precio" value={v.precio ? `${v.moneda ?? 'GTQ'} ${Number(v.precio).toLocaleString('es-GT')}` : null} />
        <Row label="Habitaciones" value={v.habitaciones} />
        <Row label="Baños" value={v.banos} />
        <Row label="Parqueos" value={v.parqueos} />
        <Row label="Área" value={v.area_m2 ? `${v.area_m2} m²` : null} />
        <Row label="Departamento" value={v.departamento} />
        <Row label="Municipio" value={v.municipio} />
        <Row label="Dirección" value={v.direccion} />
        <Row label="Descripción" value={v.descripcion} />
      </div>

      {fotos.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-2">{fotos.length} foto(s)</p>
          <div className="flex gap-2 flex-wrap">
            {fotos.slice(0, 5).map((src, i) => (
              <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-lg" />
            ))}
            {fotos.length > 5 && (
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                +{fotos.length - 5}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
