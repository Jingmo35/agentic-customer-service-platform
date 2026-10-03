import { zh } from "../i18n";
import { ArrowDown, Database, GitBranch, LockKeyhole, Search, ShieldCheck, Waypoints, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { ControlPlaneDocumentation } from "./ControlPlaneDocumentation";
import { Card, SectionHeader } from "./ui";

type ZoneProps = { className: string; title: string; description: string; badge: string; children: ReactNode };

function Zone({ className, title, description, badge, children }: ZoneProps) {
  return <details className={`architecture-zone ${className}`} open><summary className="architecture-zone-header"><div><h3>{zh(title)}</h3><p>{zh(description)}</p></div><span className="architecture-zone-badge">{zh(badge)}</span></summary><div className="architecture-zone-content">{zh(children)}</div></details>;
}

function SourceRow({ icon: Icon, title, description, tone }: { icon: typeof Search; title: string; description: string; tone: "info" | "success" }) {
  return <div className="architecture-source-row"><Icon size={17} className={tone === "info" ? "text-info" : "text-success"} aria-hidden="true" /><span><strong>{zh(title)}</strong><small>{zh(description)}</small></span></div>;
}

function DetailRow({ icon: Icon, title, description }: { icon: typeof Search; title: string; description: string }) {
  return <div className="architecture-decision-row"><Icon size={16} className="text-decision" aria-hidden="true" /><span><strong>{zh(title)}</strong><small>{zh(description)}</small></span></div>;
}

export function ArchitectureOverview() {
  return <div className="space-y-5">
    <section className="overview-hero surface"><div className="max-w-3xl"><div className="eyebrow">{zh("Architecture")}</div><h1 className="mt-2 text-3xl font-semibold tracking-tight text-main">{zh("How the platform separates context, decisions, and authority")}</h1><p className="mt-3 text-sm leading-6 text-muted">{zh("Context informs. Models propose. Systems decide. Runtime executes. The diagram uses documented boundaries and does not expose hidden model reasoning.")}</p></div></section>
    <Card as="section" className="p-5"><SectionHeader title={zh("Ownership boundaries")} description={zh("The request path is organized by who may influence a decision, not only by processing order.")} /><div className="architecture-legend" aria-label={zh("Architecture ownership legend")}><span className="architecture-legend-context"><strong>{zh("Context")}</strong><small>{zh("informs")}</small></span><span className="architecture-legend-proposal"><strong>{zh("Proposal")}</strong><small>{zh("suggests")}</small></span><span className="architecture-legend-decision"><strong>{zh("Decision")}</strong><small>{zh("validates")}</small></span><span className="architecture-legend-authority"><strong>{zh("Authority")}</strong><small>{zh("executes")}</small></span></div><div className="architecture-flow">
      <Zone className="architecture-zone-context" title={zh("Context")} description={zh("Supporting information. Never execution authority.")} badge="informs"><div className="architecture-source-list"><SourceRow icon={Waypoints} title={zh("Memory")} description={zh("Customer state, preferences, and bounded continuity for context enrichment.")} tone="info" /><SourceRow icon={Search} title={zh("RAG evidence")} description={zh("Knowledge retrieval and evidence grounding from the configured knowledge path.")} tone="success" /></div></Zone>
      <ArrowDown className="architecture-flow-arrow" size={16} aria-hidden="true" />
      <Zone className="architecture-zone-proposal" title={zh("Proposal")} description={zh("Semantic suggestion only; model output is untrusted.")} badge="suggests"><div className="architecture-source-list"><SourceRow icon={GitBranch} title={zh("LLM semantic proposal")} description={zh("Produces a structured proposal for the deterministic layers to inspect.")} tone="info" /></div></Zone>
      <ArrowDown className="architecture-flow-arrow" size={16} aria-hidden="true" />
      <Zone className="architecture-zone-decision" title={zh("Decision")} description={zh("Deterministic checks own admissibility, risk, and the final decision.")} badge="decides"><div className="architecture-decision-list"><DetailRow icon={ShieldCheck} title={zh("Provenance validation")} description={zh("Checks supported arguments, source boundaries, and target admissibility.")} /><DetailRow icon={GitBranch} title={zh("Decision compiler")} description={zh("Builds the bounded executable decision from validated inputs.")} /><DetailRow icon={LockKeyhole} title={zh("Policy and confirmation")} description={zh("Applies risk and authorization rules before any covered mutation.")} /></div></Zone>
      <ArrowDown className="architecture-flow-arrow" size={16} aria-hidden="true" />
      <Zone className="architecture-zone-authority" title={zh("Authority")} description={zh("Only controlled runtime paths may commit business effects.")} badge="executes"><div className="architecture-authority-list"><SourceRow icon={LockKeyhole} title={zh("Execution authority")} description={zh("Confirmation state and deterministic runtime controls gate effects.")} tone="success" /><SourceRow icon={Database} title={zh("Controlled effects")} description={zh("PostgreSQL-backed state, idempotency, and audit persistence.")} tone="success" /></div></Zone>
    </div></Card>
    <section className="grid gap-5 lg:grid-cols-3">
      <Card as="section" className="p-5"><SectionHeader title={zh("Evidence inputs")} description={zh("Supporting information stays non-authoritative.")} /><div className="architecture-side-list"><div><Search size={15} className="text-success" aria-hidden="true" /><span><strong>{zh("RAG evidence")}</strong><small>{zh("Knowledge retrieval and evidence grounding.")}</small></span></div><div><Waypoints size={15} className="text-info" aria-hidden="true" /><span><strong>{zh("Memory context")}</strong><small>{zh("Customer state for bounded preference enrichment.")}</small></span></div></div></Card>
      <Card as="section" className="p-5"><SectionHeader title={zh("State")} description={zh("Durable state and background work sit outside proposal generation.")} /><div className="architecture-side-list"><div><Database size={15} className="text-info" aria-hidden="true" /><span><strong>{zh("PostgreSQL")}</strong><small>{zh("Checkpoints, confirmations, and durable state.")}</small></span></div><div><Zap size={15} className="text-info" aria-hidden="true" /><span><strong>{zh("Background workers")}</strong><small>{zh("Asynchronous operational processing.")}</small></span></div></div></Card>
      <Card as="section" className="p-5"><SectionHeader title={zh("Observability")} description={zh("Bounded projections explain decisions without raw reasoning.")} /><div className="architecture-side-list"><div><GitBranch size={15} className="text-info" aria-hidden="true" /><span><strong>{zh("OpenTelemetry")}</strong><small>{zh("Runtime stages and correlation metadata.")}</small></span></div><div><ShieldCheck size={15} className="text-success" aria-hidden="true" /><span><strong>{zh("Jaeger")}</strong><small>{zh("Trace inspection for operator workflows.")}</small></span></div></div></Card>
    </section>
    <section className="architecture-boundary-callout"><LockKeyhole size={18} className="text-success" aria-hidden="true" /><div><div className="eyebrow">{zh("Execution boundary")}</div><h2 className="section-title mt-1">{zh("LLM is not the execution authority")}</h2><p className="mt-2 text-sm leading-6 text-muted">{zh("Memory enriches context and RAG provides evidence. Provenance validation, the decision compiler, policy evaluation, confirmation state, and execution authority remain deterministic control points.")}</p></div></section>
    <ControlPlaneDocumentation />
  </div>;
}
