import React, { Fragment } from 'react';

type DialogVariant = 'info' | 'success' | 'warning' | 'danger';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
  variant?: DialogVariant;
};

const variantRing: Record<DialogVariant, string> = {
  info: 'ring-blue-400/60',
  success: 'ring-emerald-400/60',
  warning: 'ring-amber-400/60',
  danger: 'ring-rose-400/60',
};

export default function Dialog({
  open,
  onClose,
  title,
  description,
  confirmText = 'OK',
  cancelText = 'Cancelar',
  onConfirm,
  showCancel,
  variant = 'info',
}: DialogProps) {
  if (!open) return null;

  function handleConfirm() {
    onConfirm?.();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      {/* overlay */}
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      {/* content */}
      <div
        className={`relative mx-4 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/90 p-5 text-slate-100 shadow-xl ring-2 ${variantRing[variant]}`}
      >
        {title && <h3 className="text-lg font-semibold">{title}</h3>}
        {description && <div className="mt-2 text-slate-300">{description}</div>}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {showCancel && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 font-medium hover:opacity-90 transition"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
