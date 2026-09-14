import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  actionPosition?: "default" | "top-right";
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  actionPosition = "default",
}: PageHeaderProps) {
  if (actionPosition === "top-right") {
    return (
      <header className="flex flex-col gap-1.5 sm:gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="mb-0.5 sm:mb-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] text-brand-blue">
                {eyebrow}
              </p>
            )}
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground leading-tight">
              {title}
            </h1>
          </div>
          {actions && <div className="shrink-0 sm:hidden">{actions}</div>}
        </div>
        {description && (
          <div className="mt-0.5 text-xs sm:text-sm leading-5 sm:leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </div>
        )}
        {actions && <div className="hidden sm:block shrink-0">{actions}</div>}
      </header>
    );
  }

  return (
    <header className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 sm:mb-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] text-brand-blue">
            {eyebrow}
          </p>
        )}
        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground">
          {title}
        </h1>
        {description && (
          <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm leading-5 sm:leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
