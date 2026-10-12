const VARIANTS = {
  default:    'bg-secondary-100 text-secondary-700',
  primary:    'bg-primary-100 text-primary-700',
  success:    'bg-success-100 text-success-700',
  warning:    'bg-warning-100 text-warning-700',
  danger:     'bg-danger-100 text-danger-700',
  // estados de propiedad
  activa:     'bg-success-100 text-success-700',
  pendiente:  'bg-warning-100 text-warning-700',
  inactiva:   'bg-secondary-100 text-secondary-600',
  vendida:    'bg-primary-100 text-primary-700',
  alquilada:  'bg-primary-100 text-primary-700',
  // vendedor verificado
  verificado: 'bg-success-100 text-success-700',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        VARIANTS[variant] ?? VARIANTS.default,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
