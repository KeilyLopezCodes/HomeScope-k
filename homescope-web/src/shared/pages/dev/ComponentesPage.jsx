import { useState } from 'react';
import { Home, CheckCircle } from 'lucide-react';
import {
  Button, Input, Textarea, Select, Checkbox,
  Card, Badge, Modal, ConfirmDialog,
  Spinner, EmptyState, Pagination, useToast,
} from '../../components/ui';

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-secondary-800 mb-4 pb-2 border-b border-secondary-200">
        {title}
      </h2>
      <div className="flex flex-wrap gap-3 items-start">{children}</div>
    </section>
  );
}

export default function ComponentesPage() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [page, setPage] = useState(3);
  const [inputVal, setInputVal] = useState('');
  const [checked, setChecked] = useState(false);

  function handleConfirm() {
    setConfirmLoading(true);
    setTimeout(() => {
      setConfirmLoading(false);
      setConfirmOpen(false);
      toast('Acción confirmada correctamente', 'success');
    }, 1500);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-secondary-900 mb-2">Biblioteca de componentes</h1>
      <p className="text-sm text-secondary-500 mb-8">Solo visible en desarrollo · <code>/dev/componentes</code></p>

      {/* Colores */}
      <Section title="Paleta de colores">
        <div className="flex flex-wrap gap-2">
          {['bg-primary-600','bg-secondary-500','bg-success-500','bg-warning-500','bg-danger-500'].map(c => (
            <div key={c} className={`${c} w-10 h-10 rounded`} title={c} />
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <div className="w-10 h-10 rounded" style={{ background: '#16a34a' }} title="semáforo verde" />
          <div className="w-10 h-10 rounded" style={{ background: '#d97706' }} title="semáforo amarillo" />
          <div className="w-10 h-10 rounded" style={{ background: '#dc2626' }} title="semáforo rojo" />
        </div>
      </Section>

      {/* Button */}
      <Section title="Button">
        <Button variant="primary">Primario</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="danger">Peligro</Button>
        <Button variant="text">Texto</Button>
        <Button variant="primary" loading>Cargando</Button>
        <Button variant="primary" disabled>Deshabilitado</Button>
        <Button variant="primary" size="sm">Pequeño</Button>
        <Button variant="primary" size="lg">Grande</Button>
      </Section>

      {/* Campos de formulario */}
      <Section title="Campos de formulario">
        <Input
          id="demo-input"
          label="Nombre"
          placeholder="Escribe tu nombre"
          required
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          className="w-full sm:w-64"
        />
        <Input
          id="demo-input-error"
          label="Email"
          placeholder="correo@ejemplo.com"
          error="El correo no es válido"
          className="w-full sm:w-64"
        />
        <Textarea
          id="demo-textarea"
          label="Descripción"
          placeholder="Escribe una descripción…"
          className="w-full sm:w-64"
        />
        <Select id="demo-select" label="Tipo de propiedad" className="w-full sm:w-64">
          <option value="">Selecciona…</option>
          <option value="casa">Casa</option>
          <option value="apartamento">Apartamento</option>
        </Select>
        <Select id="demo-select-error" label="Modalidad" error="Campo requerido" className="w-full sm:w-64">
          <option value="">Selecciona…</option>
        </Select>
        <Checkbox
          id="demo-checkbox"
          label="Acepto los términos y condiciones"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
        />
        <Checkbox
          id="demo-checkbox-error"
          label="Suscribirse al boletín"
          error="Debes aceptar para continuar"
        />
      </Section>

      {/* Card */}
      <Section title="Card">
        <Card className="p-4 w-64">
          <p className="text-sm font-medium text-secondary-800">Tarjeta de ejemplo</p>
          <p className="text-xs text-secondary-500 mt-1">Contenido de la tarjeta con padding interno.</p>
        </Card>
      </Section>

      {/* Badge */}
      <Section title="Badge">
        <Badge variant="activa">Activa</Badge>
        <Badge variant="pendiente">Pendiente</Badge>
        <Badge variant="inactiva">Inactiva</Badge>
        <Badge variant="vendida">Vendida</Badge>
        <Badge variant="alquilada">Alquilada</Badge>
        <Badge variant="verificado"><CheckCircle size={11} /> Vendedor verificado</Badge>
        <Badge variant="primary">Primario</Badge>
        <Badge variant="danger">Error</Badge>
      </Section>

      {/* Modal */}
      <Section title="Modal">
        <Button onClick={() => setModalOpen(true)}>Abrir modal</Button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Modal de ejemplo">
          <p className="text-sm text-secondary-600 mb-4">
            Este modal se cierra con <kbd className="px-1 py-0.5 bg-secondary-100 rounded text-xs">Esc</kbd> o haciendo clic fuera.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setModalOpen(false)}>Cerrar</Button>
          </div>
        </Modal>
      </Section>

      {/* ConfirmDialog */}
      <Section title="ConfirmDialog">
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>Eliminar propiedad</Button>
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          title="¿Eliminar propiedad?"
          message="Esta acción no se puede deshacer. La propiedad será eliminada permanentemente."
          confirmLabel="Sí, eliminar"
          loading={confirmLoading}
        />
      </Section>

      {/* Toast */}
      <Section title="Toast / Notificación temporal">
        <Button variant="primary"  onClick={() => toast('Operación exitosa', 'success')}>Success</Button>
        <Button variant="secondary" onClick={() => toast('Revisa los datos ingresados', 'warning')}>Warning</Button>
        <Button variant="danger"   onClick={() => toast('Ocurrió un error inesperado', 'error')}>Error</Button>
        <Button variant="text"     onClick={() => toast('Información importante', 'info')}>Info</Button>
      </Section>

      {/* Spinner */}
      <Section title="Spinner">
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
      </Section>

      {/* EmptyState */}
      <Section title="EmptyState">
        <div className="w-full border border-secondary-200 rounded-lg">
          <EmptyState
            icon={Home}
            title="No hay propiedades"
            description="Aún no has publicado ninguna propiedad. Comienza ahora."
            action={<Button size="sm">Publicar propiedad</Button>}
          />
        </div>
      </Section>

      {/* Pagination */}
      <Section title="Pagination">
        <div className="w-full">
          <Pagination page={page} totalPages={10} onPageChange={setPage} />
          <p className="text-xs text-secondary-400 text-center mt-2">Página actual: {page}</p>
        </div>
      </Section>
    </div>
  );
}
