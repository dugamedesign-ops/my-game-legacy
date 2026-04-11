type StatusBadgeProps = {
  label: string;
  variant?:
    | "default"
    | "wishlist"
    | "preorder"
    | "priority"
    | "progress"
    | "rarity"
    | "media";
};

const variantClasses: Record<NonNullable<StatusBadgeProps["variant"]>, string> =
  {
    default: "bg-white/10 text-white/90 border-white/10",
    wishlist: "bg-amber-500/20 text-amber-200 border-amber-400/20",
    preorder: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/20",
    priority: "bg-rose-500/20 text-rose-200 border-rose-400/20",
    progress: "bg-cyan-500/20 text-cyan-200 border-cyan-400/20",
    rarity: "bg-violet-500/20 text-violet-200 border-violet-400/20",
    media: "bg-slate-500/20 text-slate-200 border-slate-400/20",
  };

export function StatusBadge({
  label,
  variant = "default",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}