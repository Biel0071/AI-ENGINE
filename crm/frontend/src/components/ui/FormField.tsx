import { InputHTMLAttributes, PropsWithChildren, TextareaHTMLAttributes } from 'react';

interface BaseProps extends PropsWithChildren {
  label: string;
}

export function FormField({ label, children }: BaseProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-lg border border-borderSoft bg-panelSoft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent ${props.className || ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-lg border border-borderSoft bg-panelSoft px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent ${props.className || ''}`} />;
}
