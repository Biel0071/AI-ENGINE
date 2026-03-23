import { PropsWithChildren } from 'react';
import clsx from 'clsx';

interface CardProps extends PropsWithChildren {
  className?: string;
  title?: string;
  subtitle?: string;
}

export function Card({ className, title, subtitle, children }: CardProps) {
  return (
    <section className={clsx("rounded-2xl border border-slate-800 bg-panel/80 p-4 shadow-panel", className)}>
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}