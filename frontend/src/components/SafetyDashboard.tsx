import { zh } from "../i18n";
import { CheckCircle2, FileText, Gauge, LockKeyhole, ShieldCheck, TimerReset } from "lucide-react";
import { Badge, Card, MetricCard, SectionHeader, StatusIndicator } from "./ui";

type Props = { onOpenRuns: () => void };

const evidence = {
  deterministic: "110/110",
  safety: "40/40",
  resilience: "28/28",
  d2c: "540/540",
  trend: "15 → 3 → 0 → 0 → 0",
};

function EvidenceRow({ label, detail, value }: { label: string; detail: string; value: string }) {
  return <div className="evidence-row"><div><div className="text-sm font-medium text-main">{zh(label)}</div><div className="mt-1 text-xs text-muted">{zh(detail)}</div></div><span className="font-mono text-sm font-semibold text-success">{zh(value)}</span></div>;
}

export function SafetyDashboard({ onOpenRuns }: Props) {
  return (
    <div className="space-y-5">
      <section className="release-hero surface">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="eyebrow">{zh("Release evidence · source-bound validation")}</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-main">{zh("Safety & evaluation control")}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">{zh("A compact view of the evidence that backs the control plane. Semantic quality, deterministic containment, and operational readiness remain separate gates.")}</p>
          </div>
          <Badge tone="success"><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} aria-hidden="true" />{zh("Release evidence aligned")}</span></Badge>
        </div>
        <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={zh("Unsafe executions")} value="0" detail={zh("Containment + execution authority gate")} icon={ShieldCheck} />
          <MetricCard label={zh("Confirmation bypasses")} value="0" detail={zh("Policy boundary + persisted confirmation")} icon={LockKeyhole} />
          <MetricCard label={zh("Unauthorized mutations")} value="0" detail={zh("Scope, target, and policy validation")} icon={Gauge} />
          <MetricCard label={zh("Duplicate mutations")} value="0" detail={zh("DB idempotency + concurrency gate")} icon={TimerReset} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card as="section" className="p-5">
          <SectionHeader eyebrow={zh("Safety guarantees")} title={zh("Evidence at a glance")} description={zh("Published release evidence only; no live telemetry is implied by this view.")} />
          <div className="safety-mechanism-note"><span className="field-label">{zh("Why the zero values matter")}</span><p className="mt-1 text-xs leading-5 text-muted">{zh("They reflect separate controls: deterministic containment prevents unsafe proposals from becoming authority, confirmation gates protect covered mutations, and persistence-backed idempotency prevents duplicate effects.")}</p></div>
          <div className="divide-y divide-border/70">
            <EvidenceRow label={zh("Deterministic offline gates")} detail={zh("Containment, attribution, and resilience regression suites")} value={`${evidence.deterministic} · ${evidence.safety} · ${evidence.resilience}`} />
            <EvidenceRow label={zh("D2c semantic validation")} detail={zh("Full prospective benchmark · semantic_decision_v3")} value={evidence.d2c} />
            <EvidenceRow label={zh("D2d operational release gate")} detail={zh("Deployment, concurrency, persistence, recovery, observability")} value="PASS" />
          </div>
        </Card>
        <Card as="section" className="p-5">
          <SectionHeader eyebrow={zh("Hardening journey")} title={zh("Executable containment")} description={zh("Historical executable-survivor trend across the hardening chain.")} />
          <div className="trend-display"><span className="font-mono text-xl font-semibold tracking-tight text-main">{zh(evidence.trend)}</span><div className="mt-3 flex items-center gap-2 text-xs text-muted"><StatusIndicator label={zh("0 survivors in latest full D2c")} tone="success" compact /></div></div>
          <div className="mt-4 rounded-lg border border-info/20 bg-info/5 p-3 text-xs leading-5 text-muted">{zh("The model proposes. Deterministic software validates provenance, applies policy, and owns execution authority.")}</div>
        </Card>
      </div>

      <Card as="section" className="p-5">
        <SectionHeader eyebrow={zh("Release validation")} title={zh("Release validation status")} description={zh("Current evidence is intentionally scoped; it does not certify unrestricted production deployment.")} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {["D2c semantic validation", "D2d operational gate", "Concurrency correctness", "Restart / persistence", "Fault recovery", "Observability / privacy", "Prompt provenance", "Reference deployment"].map((label) => <div className="gate-card" key={label}><CheckCircle2 size={15} className="text-success" aria-hidden="true" /><div><div className="text-xs font-medium text-main">{zh(label)}</div><div className="mt-1 text-[11px] tracking-[.03em] text-success">{zh("validated")}</div></div></div>)}
        </div>
      </Card>
      <section className="evidence-report-entry"><div><div className="eyebrow">{zh("Bounded reporting")}</div><h2 className="section-title mt-1">{zh("Export an investigation report")}</h2><p className="mt-1 text-xs leading-5 text-muted">{zh("Choose a run to review its bounded trace, evidence, policy, and execution state. Raw prompts, secrets, and hidden reasoning remain excluded.")}</p></div><button type="button" className="operator-action shrink-0" onClick={onOpenRuns}><FileText size={14} aria-hidden="true" />{zh("Open run reports")}</button></section>
    </div>
  );
}
