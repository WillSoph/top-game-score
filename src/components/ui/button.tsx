import * as React from 'react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'neon';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed';

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2',
  lg: 'px-5 py-3 text-lg rounded-xl',
};

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-r from-emerald-500 to-blue-500 hover:opacity-90 active:opacity-100 focus:ring-emerald-400/60',
  secondary:
    'text-slate-200 bg-slate-800/70 border border-slate-700 hover:bg-slate-700 focus:ring-slate-600/50',
  ghost:
    'text-slate-200 hover:bg-slate-800/50 focus:ring-slate-600/40',
  neon:
    'text-slate-900 bg-gradient-to-r from-emerald-400 via-lime-400 to-emerald-500 ' +
    'hover:from-emerald-300 hover:via-lime-300 hover:to-emerald-400 ' +
    'shadow-[0_0_0_1px_rgba(16,185,129,.55),0_10px_30px_-10px_rgba(163,230,53,.65)] ' +
    'focus:ring-emerald-400/60',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', iconLeft, iconRight, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
      >
        {iconLeft && <span className="shrink-0">{iconLeft}</span>}
        {children}
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';

/* Conveniências mantendo nomes que você já usa */
export function ButtonPrimary(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" size="lg" {...props} />;
}

export function ButtonSecondary(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />;
}

export function ButtonNeon(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="neon" size="lg" {...props} />;
}
