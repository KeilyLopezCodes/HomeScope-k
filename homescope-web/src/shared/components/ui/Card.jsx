export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={['bg-white rounded-lg border border-secondary-200 shadow-sm', className].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
