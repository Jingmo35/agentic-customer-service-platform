import { zh } from "../../i18n";
import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

export function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail?: string; icon?: LucideIcon }) {
  return <Card className="metric-card p-4"><div className="flex items-center justify-between text-[11px] font-medium tracking-[.03em] text-muted"><span>{zh(label)}</span>{Icon && <Icon size={15} strokeWidth={1.8} aria-hidden="true" />}</div><div className="mt-2 font-mono text-lg font-semibold text-main">{zh(value)}</div>{detail && <div className="mt-1 text-xs text-muted">{zh(detail)}</div>}</Card>;
}
