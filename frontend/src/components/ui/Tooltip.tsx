import { zh } from "../../i18n";
import type { ReactNode } from "react";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) { return <span className="tooltip-wrap"><span aria-label={zh(label)}>{zh(children)}</span><span className="tooltip-content" role="tooltip">{zh(label)}</span></span>; }
