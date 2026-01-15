interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}

export function KPICard({ title, value, icon, subtitle }: KPICardProps) {
  return (
    <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)] shadow-crisp">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
          {icon}
        </div>
        <span className="text-sm font-medium text-[var(--muted)]">{title}</span>
      </div>
      <p className="text-2xl font-semibold text-[var(--foreground)] tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && (
        <p className="text-xs text-[var(--muted-light)] mt-1">{subtitle}</p>
      )}
    </div>
  );
}
