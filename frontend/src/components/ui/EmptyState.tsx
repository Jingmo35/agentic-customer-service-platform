import { zh } from "../../i18n";
import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, description, icon: Icon = Inbox, action }: { title: string; description: string; icon?: LucideIcon; action?: ReactNode }) {
  return <div className="empty-state"><Icon size={18} strokeWidth={1.6} aria-hidden="true" /><div><div className="text-sm font-medium text-main">{zh(title)}</div><p className="mt-1 text-xs leading-5 text-muted">{zh(description)}</p>{action && <div className="mt-3">{zh(action)}</div>}</div></div>;
}
