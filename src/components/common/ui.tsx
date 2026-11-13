import { Link } from 'react-router-dom';

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-white text-ink border border-line hover:border-primary',
    ghost: 'bg-transparent text-ink hover:bg-canvas',
    danger: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50',
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-white p-5 shadow-card transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(30,41,59,0.09)] ${className}`}>{children}</div>;
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  'w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none ring-primary/30 transition duration-200 placeholder:text-muted focus:border-primary/40 focus:ring-2';

export function Badge({ children, tone = 'violet' }: { children: React.ReactNode; tone?: 'violet' | 'blue' | 'pink' | 'green' }) {
  const tones = {
    violet: 'bg-primary/10 text-primary',
    blue: 'bg-secondary/15 text-sky-700',
    pink: 'bg-accent/30 text-rose-700',
    green: 'bg-success/15 text-emerald-700',
  }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones}`}>{children}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <Card className="text-center">
      <h3 className="font-display text-2xl text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-canvas ${className}`} />;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex animate-fade-up flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl text-ink md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function TextLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-sm font-semibold text-primary transition duration-200 hover:text-primary-dark">
      {children}
    </Link>
  );
}
