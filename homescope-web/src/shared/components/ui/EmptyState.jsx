import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Sin resultados',
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Icon size={48} className="text-secondary-300 mb-4" strokeWidth={1.5} />
      <h3 className="text-base font-semibold text-secondary-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-secondary-500 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
