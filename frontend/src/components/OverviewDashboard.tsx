import { zh } from "../i18n";
import { Activity, ArrowRight, Beaker, BookOpen, CheckCircle2, FileSearch, GitBranch, LockKeyhole, ShieldCheck, Waypoints } from "lucide-react";
import type { AgentRun } from "../types";
import { Badge, Card, MetricCard, SectionHeader, StatusIndicator } from "./ui";

type Props = {
  runs: AgentRun[];
  busy: boolean;
  onRunSafetyDemo: () => Promise<void>;
  onNavigate: (view: "playground" | "traces" | "evidence") => void;
};

const safetyEvidence = [
  { label: "Unsafe executions", value: "0", detail: "M6.29B D2c + M6.34 D2d" },
  { label: "Confirmation bypasses", value: "0", detail: "Release invariant" },
  { label: "Unauthorized mutations", value: "0", detail: "D2d operational gate" },
  { label: "Duplicate mutations", value: "0", detail: "D2d concurrency gate" },
];

function projectedCount(value: number): string {
  return value > 0 ? String(value) : "Not available";
}

function runCounts(runs: AgentRun[]) {
  return {
    total: runs.length,
    completed: runs.filter((run) => run.status === "completed").length,
    blocked: runs.filter((run) => run.status === "blocked" || run.status === "error").length,
    pending: runs.filter((run) => run.status === "waiting_confirmation").length,
  };
}

function contextCounts(runs: AgentRun[]) {
  return {
    memory: runs.filter((run) => run.memory.retrieved === true || (run.memory.items_used ?? run.memory.retrieved_count ?? run.memory.item_count) > 0).length,
    rag: runs.filter((run) => run.rag_documents.length > 0).length,
  };
}

function authorityCounts(runs: AgentRun[]) {
  return {
    mutations: runs.filter((run) => ["executed", "committed"].includes(run.evidence.write_outcome.status)).length,
    confirmations: runs.filter((run) => run.evidence.confirmation.required).length,
  };
}

export function OverviewDashboard({ runs, busy, onRunSafetyDemo, onNavigate }: Props) {
  const counts = runCounts(runs);
  const context = contextCounts(runs);
  const authority = authorityCounts(runs);
  return <div className="space-y-5">
    <section className="overview-hero surface">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <div className="eyebrow">{zh("Control plane")}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-main">{zh("Agent Platform")}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{zh("Inspect current runs, validation state, and execution boundaries.")}</p>
        </div>
        <StatusIndicator label={zh("Evidence consolidated")} tone="success" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="button-primary" onClick={() => { void onRunSafetyDemo(); }} disabled={busy}><Beaker size={15} aria-hidden="true" />{zh(busy ? "Running safety demo…" : "Run Safety Demo")}</button>
        <button type="button" className="operator-action" onClick={() => onNavigate("playground")}><ArrowRight size={14} aria-hidden="true" />{zh("Open playground")}</button>
      </div>
    </section>

    <Card as="section" className="overview-evidence-summary p-5"><SectionHeader eyebrow={zh("Evidence first")} title={zh("Current validation state")} description={zh("Published evidence is visible before the guided workflow; no synthetic run telemetry is added.")} /><div className="overview-evidence-grid"><div><span className="field-label">{zh("D2c semantic validation")}</span><strong>{zh("540/540 · CLOSED")}</strong><small>{zh("Current release-candidate benchmark.")}</small></div><div><span className="field-label">{zh("D2d operational gate")}</span><strong>{zh("RELEASE_GATE_PASS")}</strong><small>{zh("Deployment, recovery, and authority checks.")}</small></div><div><span className="field-label">{zh("Unsafe executions")}</span><strong>0</strong><small>{zh("Deterministic containment evidence.")}</small></div></div></Card>

    <Card as="section" className="p-5"><SectionHeader eyebrow={zh("Reference release")} title={zh("System guarantees")} description={zh("Evidence-scoped guarantees expressed as control boundaries, not marketing claims.")} /><div className="overview-guarantees-grid"><div><strong>{zh("LLM cannot execute")}</strong><small>{zh("Model outputs remain proposals. Runtime authority stays behind deterministic controls.")}</small></div><div><strong>{zh("Decisions require validation")}</strong><small>{zh("Provenance, policy, and target checks are evaluated before covered actions.")}</small></div><div><strong>{zh("Evidence-backed operation")}</strong><small>{zh("Context sources provide grounding but never receive execution authority.")}</small></div><div><strong>{zh("Duplicate effects are prevented")}</strong><small>{zh("Persistence-backed idempotency and concurrency controls protect mutations.")}</small></div></div></Card>

    <Card as="section" className="p-5"><SectionHeader eyebrow={zh("Available actions")} title={zh("Move from a request to evidence")} description={zh("Use the existing projections to follow a scenario from input through validation.")} /><div className="guided-journey"><button type="button" className="journey-step" onClick={() => { void onRunSafetyDemo(); }} disabled={busy}><span className="journey-number">1</span><Beaker size={17} className="text-info" aria-hidden="true" /><span><strong>{zh("Try a scenario")}</strong><small>{zh("Run the damaged-product refund demo.")}</small></span><ArrowRight size={14} aria-hidden="true" /></button><button type="button" className="journey-step" onClick={() => onNavigate("traces")}><span className="journey-number">2</span><FileSearch size={17} className="text-info" aria-hidden="true" /><span><strong>{zh("Inspect the decision")}</strong><small>{zh("Open the observed trace and policy result.")}</small></span><ArrowRight size={14} aria-hidden="true" /></button><button type="button" className="journey-step" onClick={() => onNavigate("traces")}><span className="journey-number">3</span><GitBranch size={17} className="text-info" aria-hidden="true" /><span><strong>{zh("Review evidence")}</strong><small>{zh("Check grounding, retrieval, and bounded metadata.")}</small></span><ArrowRight size={14} aria-hidden="true" /></button><button type="button" className="journey-step" onClick={() => onNavigate("evidence")}><span className="journey-number">4</span><ShieldCheck size={17} className="text-success" aria-hidden="true" /><span><strong>{zh("Check validation")}</strong><small>{zh("Review D2c and D2d release evidence.")}</small></span><ArrowRight size={14} aria-hidden="true" /></button></div></Card>

    <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <Card as="section" className="p-5">
        <SectionHeader eyebrow={zh("Loaded runs")} title={zh("Operational runs")} description={zh("Counts reflect the currently loaded run projection; no synthetic telemetry is added.")} />
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          <MetricCard label={zh("Projected runs")} value={projectedCount(counts.total)} detail={zh(counts.total ? "Loaded from operator API" : "Not available from current projection")} icon={Activity} />
          <MetricCard label={zh("Successful")} value={counts.total ? String(counts.completed) : "Not available"} detail={zh("status = completed")} icon={CheckCircle2} />
          <MetricCard label={zh("Blocked / failed")} value={counts.total ? String(counts.blocked) : "Not available"} detail={zh("bounded status projection")} icon={LockKeyhole} />
          <MetricCard label={zh("Awaiting confirmation")} value={counts.total ? String(counts.pending) : "Not available"} detail={zh("confirmation_required")} icon={ShieldCheck} />
        </div>
      </Card>
      <Card as="section" className="p-5">
        <SectionHeader eyebrow={zh("Decision ownership")} title={zh("LLM proposes, deterministic systems decide")} description={zh("The model contributes a proposal. Authority remains behind validation, policy, confirmation, and execution controls.")} />
        <div className="overview-boundary-flow"><span className="overview-flow-proposal">{zh("LLM proposal")}</span><ArrowRight size={15} aria-hidden="true" /><span className="overview-flow-system">{zh("Validation + policy")}</span><ArrowRight size={15} aria-hidden="true" /><span className="overview-flow-authority">{zh("Execution authority")}</span></div>
        <div className="safety-explanation-grid"><div><span className="field-label">{zh("Proposal")}</span><strong>{zh("Untrusted model output")}</strong><small>{zh("Useful for semantic intent, never sufficient to mutate state.")}</small></div><div><span className="field-label">{zh("Decision")}</span><strong>{zh("Deterministic checks")}</strong><small>{zh("Provenance, target, policy, and confirmation boundaries.")}</small></div><div><span className="field-label">{zh("Authority")}</span><strong>{zh("System-owned execution")}</strong><small>{zh("Only approved runtime paths may commit business effects.")}</small></div></div>
      </Card>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <Card as="section" className="p-5">
        <SectionHeader eyebrow={zh("Context integrity")} title={zh("Context sources")} description={zh("Counts reflect loaded run projections only; source content remains bounded.")} />
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          <MetricCard label={zh("Memory used")} value={runs.length ? String(context.memory) : "Not available"} detail={zh(runs.length ? "retrieved in loaded runs" : "Not available from current projection")} icon={Waypoints} />
          <MetricCard label={zh("RAG evidence used")} value={runs.length ? String(context.rag) : "Not available"} detail={zh(runs.length ? "document metadata present" : "Not available from current projection")} icon={BookOpen} />
        </div>
      </Card>
      <Card as="section" className="p-5">
        <SectionHeader eyebrow={zh("Authority boundary")} title={zh("Controlled effects")} description={zh("Mutation and confirmation states are projected from loaded runs, never synthesized.")} />
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          <MetricCard label={zh("Mutations executed")} value={runs.length ? String(authority.mutations) : "Not available"} detail={zh(runs.length ? "write outcome = executed/committed" : "Not available from current projection")} icon={LockKeyhole} />
          <MetricCard label={zh("Confirmations required")} value={runs.length ? String(authority.confirmations) : "Not available"} detail={zh(runs.length ? "confirmation.required = true" : "Not available from current projection")} icon={ShieldCheck} />
        </div>
      </Card>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card as="section" className="p-5">
        <SectionHeader eyebrow={zh("Safety evidence")} title={zh("Safety guarantees")} description={zh("Published release evidence only; this is not live production telemetry.")} />
        <div className="grid gap-3 sm:grid-cols-2">{safetyEvidence.map((item) => <div className="overview-safety-card" key={item.label}><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-main">{zh(item.label)}</span><StatusIndicator label={zh("PASS")} tone="success" compact /></div><div className="mt-3 font-mono text-2xl font-semibold text-success">{zh(item.value)}</div><div className="mt-1 text-[11px] text-muted">{zh(item.detail)}</div></div>)}</div>
      </Card>
      <Card as="section" className="p-5">
        <SectionHeader eyebrow={zh("Release status")} title={zh("Evaluation status")} description={zh("Separate semantic validation from operational release evidence.")} />
        <div className="space-y-2"><div className="overview-status-row"><span>{zh("D2c semantic validation")}</span><Badge tone="success">{zh("540/540 · CLOSED")}</Badge></div><div className="overview-status-row"><span>{zh("D2d operational gate")}</span><Badge tone="success">{zh("RELEASE_GATE_PASS")}</Badge></div><div className="overview-status-row"><span>{zh("Reference release")}</span><Badge tone="info">{zh("Evidence consolidated")}</Badge></div></div>
        <button type="button" className="operator-action mt-4 w-full justify-center" onClick={() => onNavigate("evidence")}><GitBranch size={14} aria-hidden="true" />{zh("View safety evidence")}</button>
      </Card>
    </section>

    <Card as="section" className="p-5">
      <SectionHeader eyebrow={zh("Next steps")} title={zh("What to inspect next")} description={zh("Follow the system from a submitted scenario to bounded operational evidence.")} />
      <div className="overview-next-grid"><button type="button" className="overview-next-card" onClick={() => onNavigate("playground")}><Beaker size={17} className="text-info" aria-hidden="true" /><span><strong>{zh("Submit a scenario")}</strong><small>{zh("Use the guided playground and safety library.")}</small></span><ArrowRight size={14} aria-hidden="true" /></button><button type="button" className="overview-next-card" onClick={() => onNavigate("traces")}><Activity size={17} className="text-info" aria-hidden="true" /><span><strong>{zh("Investigate a run")}</strong><small>{zh("Inspect trace stages, grounding, and policy.")}</small></span><ArrowRight size={14} aria-hidden="true" /></button><div className="overview-next-card overview-next-static"><ShieldCheck size={17} className="text-success" aria-hidden="true" /><span><strong>{zh("Execution stays bounded")}</strong><small>{zh("Confirmation and policy gates remain system-owned.")}</small></span></div></div>
    </Card>
  </div>;
}
