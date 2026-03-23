import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-white hover:bg-accentSoft',
        variant === 'secondary' && 'border border-borderSoft bg-panelSoft text-slate-200 hover:border-accent/40 hover:bg-slate-800',
        variant === 'danger' && 'bg-danger text-white hover:bg-red-500',
        variant === 'ghost' && 'text-slate-300 hover:bg-panelSoft',
        className,
      )}
      {...props}
    />
  );
}
