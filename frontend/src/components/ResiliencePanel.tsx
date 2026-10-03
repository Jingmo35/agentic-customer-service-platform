import { zh } from "../i18n";
import { HeartPulse, RotateCw } from "lucide-react";
import type { AgentRun, Health } from "../types";
import { healthComponentTone } from "./SystemHealth";
import { Badge, Card, EmptyState, SectionHeader, StatusIndicator } from "./ui";

export function ResiliencePanel({ health, run }: { health: Health | null; run: AgentRun | null }) {
  const components = health?.components ?? [];
  return <Card as="section" className="p-5"><SectionHeader eyebrow={zh("Operational health")} title={zh("Dependencies")} description={zh("Current availability and bounded recovery state.")} />{components.length === 0 ? <EmptyState title={zh("System health unavailable")} description={zh("Health data will appear when the operator API responds.")} icon={HeartPulse} /> : <div className="grid gap-2 sm:grid-cols-3">{components.map((component) => <div className="health-row" key={component.name}><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium capitalize text-main">{zh(component.name)}</span><StatusIndicator label={zh(component.status)} tone={healthComponentTone(component.status)} compact /></div><div className="mt-2 text-xs text-muted">{zh(component.detail)}</div></div>)}</div>}{run?.failure_category && <div className="notice notice-warning mt-4"><RotateCw size={15} aria-hidden="true" /><span><strong>{zh("Recent recovery")}</strong> · {zh(run.failure_category.replace(/_/g, " "))} · {zh(run.recovery_action ?? "safe failure")}</span><Badge tone="warning">{zh("degraded")}</Badge></div>}</Card>;
}
