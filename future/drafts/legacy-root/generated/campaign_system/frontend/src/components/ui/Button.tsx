import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-cyan text-slate-950 hover:brightness-110",
        variant === "secondary" && "border border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/20",
        variant === "ghost" && "text-slate-300 hover:bg-panelSoft",
        className,
      )}
      {...props}
    />
  );
}