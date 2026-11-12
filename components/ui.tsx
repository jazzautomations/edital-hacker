import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* Peças de interface do Manager. Uma fonte só pra botão, campo, cartão e
   estado vazio — antes cada página reinventava as suas. */

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-emerald-400 text-neutral-950 hover:bg-emerald-300 font-semibold",
  secondary: "border border-neutral-700 text-neutral-100 hover:border-neutral-500 hover:bg-neutral-900 font-medium",
  ghost: "text-neutral-300 hover:bg-neutral-900 hover:text-neutral-50 font-medium",
  danger: "border border-red-500/40 text-red-300 hover:bg-red-500/10 font-medium",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-full",
  md: "h-10 px-4 text-sm rounded-full",
  lg: "h-12 px-6 text-base rounded-full",
};
const btn = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cx("inline-flex items-center justify-center gap-2 whitespace-nowrap", VARIANT[variant], SIZE[size], extra);

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading} className={btn(variant, size, className)}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant,
  size,
  className,
  children,
  href,
  external,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  href: string;
  external?: boolean;
}) {
  if (external || href.startsWith("http") || href.startsWith("/login")) {
    return (
      <a href={href} className={btn(variant, size, className)} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={btn(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}

const FIELD =
  "h-11 w-full rounded-xl bg-neutral-900 px-3.5 text-sm text-neutral-100 placeholder:text-neutral-500 disabled:opacity-60";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-neutral-200">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-red-300">{error}</span>
      ) : hint ? (
        <span className="text-xs text-neutral-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(FIELD, props.className)} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(FIELD, "pr-8", props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(FIELD, "h-auto min-h-24 py-3 leading-relaxed", props.className)} />;
}

export function Card({ className, children, as: As = "div" }: { className?: string; children: ReactNode; as?: "div" | "section" | "li" | "article" }) {
  return <As className={cx("min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 sm:p-6", className)}>{children}</As>;
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400">{eyebrow}</p>}
        <h1 className="text-4xl text-neutral-50 sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 text-base leading-relaxed text-neutral-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Page({ children, width = "max-w-5xl" }: { children: ReactNode; width?: string }) {
  return <main className={cx("mx-auto w-full px-4 py-8 sm:px-6 sm:py-12", width)}>{children}</main>;
}

type Tone = "neutral" | "good" | "warn" | "bad" | "info";
const TONE: Record<Tone, string> = {
  neutral: "border-neutral-700 bg-neutral-900 text-neutral-300",
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  bad: "border-red-500/40 bg-red-500/10 text-red-300",
  info: "border-violet-500/40 bg-violet-500/10 text-violet-300",
};
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex shrink-0 items-center gap-1 self-start whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs", TONE[tone], className)}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-800 px-6 py-12 text-center">
      {icon && <div className="text-3xl" aria-hidden>{icon}</div>}
      <p className="text-lg font-semibold text-neutral-100">{title}</p>
      {children && <p className="max-w-md text-sm leading-relaxed text-neutral-400">{children}</p>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "warn", children }: { tone?: Tone; children: ReactNode }) {
  return <div role="status" className={cx("rounded-xl border px-4 py-3 text-sm leading-relaxed", TONE[tone])}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-xl bg-neutral-900", className)} />;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">{children}</h2>
      {aside}
    </div>
  );
}

export const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

/** 2026-12-20 → 20 de dez. (sem cair um dia por causa de fuso) */
export function dataCurta(iso?: string | null, withYear = false): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

export function diasAte(iso?: string | null): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}
