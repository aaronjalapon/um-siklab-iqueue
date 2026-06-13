import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-blue">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {title}
        </h1>
        {description && (
          <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
