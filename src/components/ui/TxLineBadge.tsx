export function TxLineBadge({
  status = "active",
}: {
  status?: "active" | "synced" | "pending" | "verified";
}) {
  const variants: Record<string, string> = {
    active: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    synced: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    verified: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <span className={`txline-badge ${variants[status]}`}>
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 6l1.5 1.5L8 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
       Sports data {status}
    </span>
  );
}
