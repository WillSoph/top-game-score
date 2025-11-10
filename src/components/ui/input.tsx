import * as React from 'react';
import { cn } from '../../lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={cn(
        // mobile-first
        'block w-full min-h-[44px] px-3 py-3 rounded-lg',
        'bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500',
        className
      )}
    />
  );
}
