import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Loader2,
  type LucideIcon,
} from "lucide-react";

export type ModalVariant =
  | "default"
  | "danger"
  | "warning"
  | "success"
  | "info";

export type ModalActionVariant = "primary" | "danger" | "secondary";

export interface ModalAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: ModalActionVariant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
}

export interface AppModalProps {
  open: boolean;
  onClose: () => void;

  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;

  variant?: ModalVariant;

  image?: string;
  imageAlt?: string;
  imagePosition?: "left" | "top";

  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;

  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;

  loading?: boolean;
  maxWidth?: "md" | "lg" | "xl";

  ariaCloseLabel?: string;
}

const variantStyles = {
  default: {
    icon: Info,
    iconColor: "text-cyan-300",
    iconBg: "bg-cyan-400/10",
    iconBorder: "border-cyan-400/25",
  },
  danger: {
    icon: AlertTriangle,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10",
    iconBorder: "border-rose-400/30",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-300",
    iconBg: "bg-amber-400/10",
    iconBorder: "border-amber-400/30",
  },
  success: {
    icon: CheckCircle2,
    iconColor: "text-emerald-300",
    iconBg: "bg-emerald-400/10",
    iconBorder: "border-emerald-400/30",
  },
  info: {
    icon: Info,
    iconColor: "text-cyan-300",
    iconBg: "bg-cyan-400/10",
    iconBorder: "border-cyan-400/30",
  },
};

const actionStyles: Record<ModalActionVariant, string> = {
  primary:
    "border-emerald-300/40 bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 hover:brightness-110",

  danger:
    "border-rose-400/60 bg-gradient-to-r from-rose-600/80 to-pink-600/80 text-white hover:brightness-110",

  secondary: "border-white/20 bg-white/5 text-slate-100 hover:bg-white/10",
};

const widthStyles = {
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export default function AppModal({
  open,
  onClose,
  title,
  description,
  children,
  variant = "default",
  image,
  imageAlt = "",
  imagePosition = "left",
  primaryAction,
  secondaryAction,
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  loading = false,
  maxWidth = "lg",
  ariaCloseLabel = "Close",
}: AppModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const isBusy =
    loading || !!primaryAction?.loading || !!secondaryAction?.loading;

  const canClose = !isBusy;

  const styles = variantStyles[variant];
  const StatusIcon = styles.icon;

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      const focusable = modalRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      (closeRef.current || focusable || modalRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && closeOnEscape && canClose) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      ).filter((element) => element.getClientRects().length > 0);

      if (focusableElements.length === 0) {
        event.preventDefault();
        modalRef.current?.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeOnEscape, canClose, onClose]);

  if (!open) return null;

  const renderAction = (
    action: ModalAction,
    fallbackVariant: ModalActionVariant,
  ) => {
    const Icon = action.icon;
    const isLoading = action.loading || false;

    return (
      <button
        type="button"
        onClick={() => {
          if (!isBusy) {
            void action.onClick();
          }
        }}
        disabled={isBusy || action.disabled || isLoading}
        className={`
          inline-flex min-h-12 flex-1 items-center
          justify-center gap-2 rounded-xl border
          px-5 py-3 text-sm font-extrabold
          transition-all duration-200
          disabled:cursor-not-allowed
          disabled:opacity-50
          ${actionStyles[action.variant || fallbackVariant]}
        `}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : Icon ? (
          <Icon className="h-5 w-5" />
        ) : null}

        <span>{action.label}</span>
      </button>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#020713]/80 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          closeOnBackdrop &&
          canClose
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`
          relative my-auto w-full overflow-hidden
          rounded-[24px] border border-fuchsia-400/50
          bg-[#0a1128]
          shadow-[0_0_65px_rgba(168,85,247,0.2)]
          outline-none
          ${widthStyles[maxWidth]}
        `}
      >
        {/* Background decorativo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-violet-600/15 blur-[90px]" />

          <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[90px]" />

          <div className="absolute -top-28 left-[40%] h-[400px] w-[3px] rotate-45 bg-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,.5)]" />

          <div className="absolute -bottom-24 right-[15%] h-[300px] w-20 rotate-45 bg-purple-500/10" />

          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#11152c]/20 to-purple-950/30" />
        </div>

        {/* Botão fechar */}
        {showCloseButton && (
          <button
            ref={closeRef}
            type="button"
            onClick={() => {
              if (canClose) onClose();
            }}
            disabled={!canClose}
            aria-label={ariaCloseLabel}
            className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#10182f]/80 text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div
          className={`
            relative z-10
            ${
              image && imagePosition === "left"
                ? "grid grid-cols-1 md:grid-cols-[38%_62%]"
                : "flex flex-col"
            }
          `}
        >
          {/* Imagem lateral */}
          {image && imagePosition === "left" && (
            <div className="relative hidden min-h-[360px] items-end justify-center overflow-hidden md:flex">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-transparent" />

              <img
                src={image}
                alt={imageAlt}
                className="relative z-10 max-h-[480px] w-full object-contain object-bottom"
              />
            </div>
          )}

          <div className="flex min-w-0 flex-col justify-center px-5 pb-6 pt-14 sm:px-8 sm:pb-8 sm:pt-12">
            {/* Imagem superior */}
            {image && imagePosition === "top" && (
              <div className="mb-5 flex justify-center">
                <img
                  src={image}
                  alt={imageAlt}
                  className="max-h-44 w-auto object-contain sm:max-h-56"
                />
              </div>
            )}

            {/* Ícone */}
            <div
              className={`
                mb-5 flex h-16 w-16 items-center
                justify-center rounded-2xl border
                ${styles.iconBg}
                ${styles.iconBorder}
              `}
            >
              <StatusIcon className={`h-8 w-8 ${styles.iconColor}`} />
            </div>

            {/* Título */}
            <h2
              id={titleId}
              className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl"
            >
              {title}
            </h2>

            {/* Descrição */}
            {description && (
              <div
                id={descriptionId}
                className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base"
              >
                {description}
              </div>
            )}

            {/* Conteúdo personalizado */}
            {children && <div className="mt-5">{children}</div>}

            {/* Ações */}
            {(primaryAction || secondaryAction) && (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {secondaryAction && renderAction(secondaryAction, "secondary")}

                {primaryAction && renderAction(primaryAction, "primary")}
              </div>
            )}
          </div>
        </div>

        {/* Borda inferior neon */}
        <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      </div>
    </div>,
    document.body,
  );
}
