import { PropsWithChildren } from 'react';
import clsx from 'clsx';

interface CardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function Card({ title, subtitle, className, children }: CardProps) {
  return (
    <section className={clsx('rounded-xl border border-borderSoft bg-panel p-4 shadow-card', className)}>
      {(title || subtitle) && (
        <header className="mb-3">
          {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
