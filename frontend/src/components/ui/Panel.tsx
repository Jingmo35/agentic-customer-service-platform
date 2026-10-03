import { zh } from "../../i18n";
import type { ReactNode } from "react";
import { SectionHeader } from "./SectionHeader";
import { Card } from "./Card";

type PanelProps = { title: string; description?: string; eyebrow?: string; children: ReactNode; className?: string };

export function Panel({ title, description, eyebrow, children, className = "" }: PanelProps) {
  return <Card as="section" className={`p-5 ${className}`}><SectionHeader eyebrow={zh(eyebrow)} title={zh(title)} description={zh(description)} />{zh(children)}</Card>;
}
