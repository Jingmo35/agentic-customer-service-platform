import { zh } from "../../i18n";
import type { ReactNode } from "react";

export function SectionHeader({ title, description, eyebrow, action }: { title: string; description?: string; eyebrow?: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-start justify-between gap-4"><div>{eyebrow && <div className="eyebrow">{zh(eyebrow)}</div>}<h2 className="section-title">{zh(title)}</h2>{description && <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">{zh(description)}</p>}</div>{zh(action)}</div>;
}
