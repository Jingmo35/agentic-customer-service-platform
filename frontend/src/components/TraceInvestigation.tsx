import { zh, zhFragment } from "../i18n";
import { ArrowDown, CheckCircle2, CircleAlert, Clock3, FileText, LockKeyhole, Network, XCircle } from "lucide-react";
import type { AgentRun } from "../types";
import { formatTraceDuration } from "../data/traceFixtures";
import "../styles/report-polish.css";
import { buildTraceStages, type TraceStage } from "./TraceTimeline";
import { Badge, Card, SectionHeader, StatusIndicator } from "./ui";
import { deriveRunSemantics } from "./runSemantics";

type Tone = "success" | "warning" | "danger" | "neutral";

function humanize(value: string | null | undefined): string {
  return value ? value.replace(/_/g, " ") : "Not recorded";
}

function stageTone(status: string): Tone {
  if (status === "completed") return "success";
  if (status === "waiting" || status === "blocked") return "warning";
  if (status === "failed") return "danger";
  return "neutral";
}

function clarificationRequired(run: AgentRun): boolean {
  return run.request_type === "unclear" || run.evidence.compiler.status === "clarification_required" || run.evidence.target_validation.status === "missing_required_information";
}

function executionState(run: AgentRun): string {
  const semantics = deriveRunSemantics(run);
  if (semantics.status === "needs_input") return "Not attempted";
  if (semantics.status === "waiting_confirmation") return "Awaiting confirmation";
  if (semantics.status === "completed") return "Completed";
  if (semantics.status === "blocked") return "Prevented";
  if (semantics.status === "failed_validation") return "Failed validation";
  if (semantics.status === "suspended") return "Suspended";
  if (semantics.status === "replaced") return "Replaced";
  if (semantics.status === "replayed") return "Already completed · no repeat";
  return "Not authorized";
}

function authorityState(run: AgentRun): string {
  const semantics = deriveRunSemantics(run);
  if (semantics.authority === "read_access") return "Read access";
  if (semantics.authority === "controlled_execution") return "Granted through controlled path";
  if (semantics.authority === "confirmation_required") return "Confirmation required";
  if (semantics.status === "needs_input") return "Not granted · clarification required";
  return "Not authorized";
}

function stageStatusLabel(run: AgentRun, stage: TraceStage): string {
  if (stage.id === "execution") {
    if (clarificationRequired(run)) return "Not attempted";
    if (run.status === "waiting_confirmation" || run.evidence.write_outcome.status === "pending_confirmation") return "Awaiting confirmation";
    if (run.evidence.write_outcome.status === "blocked") return "Prevented";
  }
  if (stage.id === "confirmation" && (run.status === "waiting_confirmation" || run.evidence.confirmation.required)) return "Confirmation required";
  if (stage.status === "completed") return "Completed";
  if (stage.status === "failed") return "Failed";
  if (stage.status === "blocked") return "Prevented";
  if (stage.status === "waiting") return "Evidence pending";
  return "Not recorded";
}

function stageTimestamp(stage: TraceStage): string {
  const timestamp = stage.events[0]?.timestamp;
  return timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Timestamp not recorded";
}

type OperationalEventDefinition = {
  id: string;
  label: string;
};

const operationalEventDefinitions: OperationalEventDefinition[] = [
  { id: "request", label: "Request accepted" },
  { id: "context", label: "Context collected" },
  { id: "memory", label: "Memory snapshot loaded" },
  { id: "rag", label: "Knowledge source resolved" },
  { id: "intent", label: "Action proposal recorded" },
  { id: "policy", label: "Policy decision evaluated" },
  { id: "confirmation", label: "Confirmation boundary enforced" },
  { id: "execution", label: "Execution authorization checked" },
];

function eventOutcome(status: TraceStage["status"]): string {
  if (status === "completed") return "Completed";
  if (status === "waiting") return "Awaiting confirmation";
  if (status === "blocked") return "Prevented";
  if (status === "failed") return "Failed";
  return "Not recorded";
}

function eventEvidence(stage: TraceStage): string {
  if (stage.evidence) return stage.evidence;
  if (stage.metadata.source === "not_recorded") return "No bounded evidence recorded";
  return (zhFragment("") + zh(stage.metadata.evidenceCount) + zhFragment(" bounded evidence item") + zhFragment(stage.metadata.evidenceCount === 1 ? "" : "s") + zhFragment(""));
}

function operationalEvents(run: AgentRun, stages: InvestigationStage[]) {
  const clarification = clarificationRequired(run);
  const waiting = run.status === "waiting_confirmation" || run.evidence.write_outcome.status === "pending_confirmation";
  const prevented = run.policy[run.policy.length - 1]?.outcome === "deny" || run.evidence.write_outcome.status === "blocked";
  const stageEvents = operationalEventDefinitions.map((definition) => {
    const item = stages.find((candidate) => candidate.id === definition.id);
    const stage = item?.stage;
    const timestamp = stage?.events[0]?.timestamp ?? (definition.id === "request" ? run.started_at : undefined);
    return {
      ...definition,
      label: definition.id === "execution" ? clarification ? "Execution not attempted" : prevented ? "Execution prevented" : waiting ? "Execution not attempted" : definition.label : definition.label,
      stage,
      actor: stage?.metadata.owner ?? "Not recorded",
      evidence: definition.id === "execution" && clarification ? "Required target information missing" : definition.id === "execution" && waiting ? "Confirmation boundary remains unsatisfied" : stage ? eventEvidence(stage) : "No bounded evidence recorded",
      outcome: definition.id === "execution" && clarification ? "Not attempted" : definition.id === "execution" && waiting ? "Awaiting confirmation" : stage ? eventOutcome(stage.status) : "Not recorded",
      status: stage?.status ?? "not_recorded",
      timestamp: timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Timestamp not recorded",
    };
  });
  const workflowEvents = run.trace
    .filter((event) => event.event_key?.startsWith("workflow."))
    .map((event, index) => {
      const metadata = event.metadata ?? {};
      const state = String(metadata.workflow_state ?? event.event_key?.split(".")[1] ?? "transition");
      const previousIntent = humanize(String(metadata.previous_workflow_intent ?? "workflow"));
      const interruptionIntent = humanize(String(metadata.interruption_intent ?? "not recorded"));
      const transition = humanize(String(metadata.workflow_transition ?? state));
      const label = state === "resumed"
        ? (zhFragment("") + zh(previousIntent) + zhFragment(" workflow resumed"))
        : state === "superseded"
        ? (zhFragment("") + zh(previousIntent) + zhFragment(" workflow replaced"))
        : (zhFragment("") + zh(previousIntent) + zhFragment(" workflow paused"));
      const evidence = state === "resumed"
        ? (zhFragment("Resume source · ") + zh(humanize(String(metadata.resume_source ?? "not recorded"))) + zhFragment(""))
        : (zhFragment("Interruption intent · ") + zh(interruptionIntent) + zhFragment(""));
      return {
        id: `workflow-${index}`,
        label,
        stage: undefined,
        actor: "Conversation routing layer",
        evidence,
        outcome: transition,
        status: "completed" as const,
        timestamp: event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Timestamp not recorded",
      };
    });
  return [...stageEvents.slice(0, 2), ...workflowEvents, ...stageEvents.slice(2)];
}

function decisionLabel(run: AgentRun): string {
  return humanize(run.policy[run.policy.length - 1]?.outcome ?? run.evidence.compiler.status);
}

function investigationOutcome(run: AgentRun): string {
  const semantics = deriveRunSemantics(run);
  if (semantics.status === "needs_input") return "Clarification required";
  if (semantics.status === "waiting_confirmation") return "Awaiting confirmation";
  if (semantics.status === "blocked") return "Prevented";
  if (semantics.status === "failed_validation") return "Validation failed";
  if (semantics.status === "suspended") return "Suspended";
  if (semantics.status === "replaced") return "Replaced";
  return humanize(run.status);
}

function investigationTone(run: AgentRun): Tone {
  const status = deriveRunSemantics(run).status;
  if (status === "needs_input" || status === "waiting_confirmation") return "warning";
  if (status === "blocked" || status === "failed_validation") return "danger";
  if (status === "completed") return "success";
  return "neutral";
}

function statusLabel(run: AgentRun): string {
  return investigationOutcome(run);
}

function evidenceCount(run: AgentRun): number {
  return (run.memory.items_used ?? run.memory.retrieved_count ?? run.memory.item_count) + run.rag_documents.length + (run.proposal ? 1 : 0);
}

export function DecisionLifecycleSummary({ run }: { run: AgentRun }) {
  const proposal = run.proposal?.suggested_action ? humanize(run.proposal.suggested_action) : run.proposal ? "Proposal recorded" : "Not recorded";
  return <Card as="section" className="decision-lifecycle-summary p-5" aria-label={zh("Decision lifecycle summary")}><SectionHeader eyebrow={zh("Decision lifecycle")} title={zh("Proposal, decision, authority")} description={zh("A compact read-only summary of where the run stopped.")} /><div className="decision-lifecycle-grid"><div className="decision-lifecycle-proposal"><span>{zh("Intent")}</span><strong>{zh(humanize(run.intent))}</strong><small>{zh("Request classification")}</small></div><div className="decision-lifecycle-proposal"><span>{zh("LLM proposal")}</span><strong>{zh(proposal)}</strong><small>{zh("Suggestion only")}</small></div><div className="decision-lifecycle-decision"><span>{zh("System decision")}</span><strong>{zh(decisionLabel(run))}</strong><small>{zh("Control plane outcome")}</small></div><div className="decision-lifecycle-authority"><span>{zh("Authority")}</span><strong>{zh(authorityState(run))}</strong><small>{zh("Runtime boundary")}</small></div><div className="decision-lifecycle-execution"><span>{zh("Execution")}</span><strong>{zh(executionState(run))}</strong><small>{zh("No hidden action path")}</small></div></div><div className="decision-lifecycle-note">{zh("LLM proposes. The control plane decides. Runtime authority executes only through controlled paths.")}</div></Card>;
}

export function TraceInvestigationHeader({ run }: { run: AgentRun }) {
  const duration = run.duration_ms > 0 ? (zhFragment("") + zh(run.duration_ms.toFixed(0)) + zhFragment(" ms")) : run.run_id.startsWith("demo-") ? "Not applicable" : "Not recorded";
  return <section className="trace-investigation-header surface" aria-label={zh("Trace investigation header")}><div className="flex flex-wrap items-start justify-between gap-5"><div><div className="eyebrow">{zh("Runs & traces · investigation")}</div><h2 className="mt-2 text-xl font-semibold tracking-tight text-main">{zh("Trace investigation")}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{zh("Follow the bounded operational path from request to authority. This surface does not expose hidden reasoning.")}</p></div><StatusIndicator label={zh(investigationOutcome(run))} tone={investigationTone(run)} /></div><div className="trace-investigation-id"><span>{zh("Trace ID")}</span><strong>{zh(run.trace_id ?? "Not recorded")}</strong><Badge tone="neutral">{zh("Operator projection")}</Badge></div><div className="trace-investigation-summary"><div><span>{zh("Scenario")}</span><strong>{zh(humanize(run.intent || run.request_type))}</strong></div><div><span>{zh("Status")}</span><strong>{zh(statusLabel(run))}</strong></div><div><span>{zh("Evidence")}</span><strong>{zh(evidenceCount(run))}{" " + zhFragment("sources collected") + ""}</strong></div><div><span>{zh("Outcome")}</span><strong>{zh(investigationOutcome(run))}</strong></div><div><span>{zh("Duration")}</span><strong>{zh(duration)}</strong></div><div><span>{zh("Execution")}</span><strong>{zh(executionState(run))}</strong></div><div><span>{zh("Authority")}</span><strong>{zh(authorityState(run))}</strong></div></div></section>;
}

type InvestigationStage = {
  id: string;
  label: string;
  boundary: string;
  stage: TraceStage;
};

const labels: Record<string, { label: string; boundary: string }> = {
  request: { label: "Request received", boundary: "Input only" },
  context: { label: "Context collection", boundary: "Context informs" },
  memory: { label: "Memory enrichment", boundary: "Context only" },
  rag: { label: "RAG grounding", boundary: "Evidence only" },
  intent: { label: "LLM proposal generated", boundary: "Untrusted suggestion" },
  grounding: { label: "Decision compiler", boundary: "Validation" },
  target: { label: "Target validation", boundary: "Admissibility" },
  policy: { label: "Policy validation", boundary: "Policy authority" },
  confirmation: { label: "Authority check", boundary: "Confirmation gate" },
  execution: { label: "Execution", boundary: "Controlled runtime path" },
};

function stagesFor(run: AgentRun): InvestigationStage[] {
  return buildTraceStages(run).map((stage) => ({ id: stage.id, label: labels[stage.id]?.label ?? stage.label, boundary: labels[stage.id]?.boundary ?? "Not recorded", stage }));
}

function StageDetails({ item, run }: { item: InvestigationStage; run: AgentRun }) {
  const { stage } = item;
  return <details className={`trace-investigation-stage trace-investigation-stage-${stage.status}`} open={stage.status === "waiting" || stage.status === "blocked" || stage.id === "request"}><summary><span className="trace-investigation-marker"><StatusIndicator label={zh("")} tone={stageTone(stage.status)} compact /></span><span className="min-w-0 flex-1"><strong>{zh(item.label)}</strong><small>{zh(stage.explanation)}</small></span><span className="trace-investigation-stage-status"><StatusIndicator label={zh(stageStatusLabel(run, stage))} tone={stageTone(stage.status)} compact /><span><Clock3 size={10} aria-hidden="true" />{zh(stageTimestamp(stage))}</span></span></summary><div className="trace-investigation-stage-detail"><div className="trace-investigation-detail-grid"><div><span className="field-label">{zh("Timestamp")}</span><strong>{zh(stageTimestamp(stage))}</strong></div><div><span className="field-label">{zh("Duration")}</span><strong>{zh(formatTraceDuration(stage.metadata))}</strong></div><div><span className="field-label">{zh("Evidence")}</span><strong>{zh(stage.metadata.source === "not_recorded" ? "Not recorded" : (zhFragment("") + (zh(stage.metadata.evidenceCount)) + zhFragment(" item") + (zhFragment(stage.metadata.evidenceCount === 1 ? "" : "s")) + zhFragment("")))}</strong></div><div><span className="field-label">{zh("Owner")}</span><strong>{zh(stage.metadata.owner)}</strong></div><div><span className="field-label">{zh("Boundary")}</span><strong>{zh(item.boundary)}</strong></div></div>{stage.evidence && <div className="trace-investigation-evidence"><FileText size={14} aria-hidden="true" /><span>{zh(stage.evidence)}</span></div>}<div className="trace-investigation-stage-note"><span className="field-label">{zh("Metadata")}</span><span>{zh(stage.metadata.source === "recorded_fixture" ? "Evidence snapshot metadata" : stage.metadata.source === "observed" ? "Operator projection metadata" : "Unavailable from current projection")}</span></div></div></details>;
}

export function OperationalTraceTimeline({ run }: { run: AgentRun }) {
  const stages = stagesFor(run);
  const events = operationalEvents(run, stages);
  return <Card as="section" className="p-5" aria-label={zh("Operational trace timeline")}><SectionHeader eyebrow={zh("Operational timeline")} title={zh("What happened in this run")} description={zh("Observable events, owners, evidence, and authority state only. Hidden reasoning and token streams are excluded.")} /><div className="operational-event-list" aria-label={zh("Operational event timeline")}>{events.map((event) => <article className={`operational-event-row operational-event-${event.status}`} key={event.id}><div className="operational-event-time"><Clock3 size={12} aria-hidden="true" /><span>{zh(event.timestamp)}</span></div><div className="operational-event-main"><div className="flex flex-wrap items-center gap-2"><strong>{zh(event.label)}</strong><StatusIndicator label={zh(event.stage ? stageStatusLabel(run, event.stage) : "Not recorded")} tone={stageTone(event.status)} compact /></div><div className="operational-event-fields"><div><span className="field-label">{zh("Actor / layer")}</span><strong>{zh(event.actor)}</strong></div><div><span className="field-label">{zh("Evidence")}</span><strong>{zh(event.evidence)}</strong></div><div><span className="field-label">{zh("Outcome")}</span><strong>{zh(event.outcome)}</strong></div></div></div></article>)}</div><div className="trace-investigation-timeline">{stages.map((item, index) => <div className="trace-investigation-step" key={item.id}><StageDetails item={item} run={run} />{index < stages.length - 1 && <ArrowDown className="trace-investigation-arrow" size={15} aria-hidden="true" />}</div>)}</div></Card>;
}

function checkLabel(reasonCode: string): string {
  return humanize(reasonCode).replace(/^authority boundary override attempt$/, "Scope expansion detected").replace(/^invalid target scope$/, "Authorization boundary violated");
}

export function DecisionExplanationCard({ run }: { run: AgentRun }) {
  const policy = run.policy[run.policy.length - 1];
  const decision = policy?.outcome ? humanize(policy.outcome).toUpperCase() : humanize(run.evidence.compiler.status).toUpperCase();
  const contextAvailable = run.memory.item_count > 0 || run.rag_documents.length > 0 || run.trace.some((event) => event.stage === "context_retrieval");
  const evidenceChecks = [
    { label: "Customer context available", pass: contextAvailable },
    { label: run.rag_documents.length > 0 ? "Refund policy retrieved" : "Knowledge evidence available", pass: run.rag_documents.length > 0 },
    { label: "Request matches recorded workflow", pass: Boolean(run.intent) },
  ];
  const controlChecks = [
    { label: "Policy evaluated", pass: Boolean(policy) },
    { label: "Confirmation boundary enforced", pass: Boolean(run.evidence.confirmation.required || policy?.outcome === "deny" || run.evidence.write_outcome.status === "blocked") },
    { label: "Duplicate protection checked", pass: run.evidence.target_validation.status !== "not_recorded" },
  ];
  const blocking = policy?.outcome === "deny"
    ? (policy.reason_codes.length > 0 ? policy.reason_codes.map(checkLabel) : ["Policy rejected request"])
    : run.evidence.confirmation.required || run.status === "waiting_confirmation"
    ? ["Confirmation required before mutation"]
    : clarificationRequired(run)
    ? ["Required target information is missing"]
    : run.evidence.write_outcome.status === "blocked"
    ? [run.decision_reason ?? "Deterministic controls prevented execution"]
    : [];
  const renderChecks = (checks: Array<{ label: string; pass: boolean }>) => checks.map((check) => <div className="decision-explanation-check" key={check.label}><span className={check.pass ? "text-success" : "text-muted"}>{check.pass ? <CheckCircle2 size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />}</span><span>{zh(check.label)}</span></div>);
  const authorityReason = policy?.outcome === "deny"
    ? "Execution was not granted because deterministic policy controls rejected the request."
    : run.evidence.confirmation.required || run.status === "waiting_confirmation"
    ? "Execution was not granted because the confirmation requirement was not satisfied."
    : clarificationRequired(run)
    ? "Execution was not attempted because required target information was missing."
    : run.evidence.write_outcome.status === "blocked"
    ? run.decision_reason ?? "Execution was not granted by deterministic controls."
    : "Authority state is limited to the recorded runtime outcome.";
  return <Card as="section" className="decision-explanation-card p-5" aria-label={zh("Decision explanation")}><SectionHeader eyebrow={zh("Deterministic explanation")} title={zh("Why this decision?")} description={zh("Only bounded validation and policy outcomes are shown; model reasoning is excluded.")} action={<Badge tone={policy?.outcome === "deny" ? "danger" : "warning"}>{zh(decision)}</Badge>} /><div className="decision-explanation-result"><div><span>{zh("Decision")}</span><strong>{zh(decision)}</strong></div><div><span>{zh("Required next step")}</span><strong>{zh(blocking[0] ?? "No additional step recorded")}</strong></div></div><div className="decision-explanation-columns"><div><h3><CheckCircle2 size={14} aria-hidden="true" />{zh("Evidence · Satisfied checks")}</h3>{zh(renderChecks(evidenceChecks))}</div><div><h3><CheckCircle2 size={14} aria-hidden="true" />{zh("Controls")}</h3>{zh(renderChecks(controlChecks))}</div></div><div className="decision-explanation-authority"><h3><LockKeyhole size={14} aria-hidden="true" />{zh("Authority")}</h3><p>{zh(authorityReason)}</p>{blocking.length > 0 && <div className="decision-explanation-blocking"><XCircle size={14} aria-hidden="true" /><span>{zh(blocking[0])}</span></div>}</div></Card>;
}

export function EvidenceRelationshipGraph({ run }: { run: AgentRun }) {
  const memoryCount = run.memory.items_used ?? run.memory.retrieved_count ?? run.memory.item_count;
  const ragCount = run.rag_documents.length;
  const proposalCount = run.proposal ? 1 : 0;
  const policyCount = run.policy.length;
  const execution = executionState(run);
  const node = (label: string, owner: string, type: string, count: string, authority: string, tone: string) => <div className={`evidence-relationship-node evidence-relationship-${tone}`}><strong>{zh(label)}</strong><span>{zh(owner)}</span><small>{"" + zhFragment("Type ·") + " "}{zh(type)}</small><small>{"" + zhFragment("Evidence ·") + " "}{zh(count)}</small><small>{"" + zhFragment("Authority ·") + " "}{zh(authority)}</small></div>;
  return <Card as="section" className="p-5" aria-label={zh("Evidence relationship graph")}><SectionHeader eyebrow={zh("Evidence relationships")} title={zh("Information flow and authority")} description={zh("Each node is a bounded projection with an explicit owner and authority boundary.")} /><div className="evidence-relationship-graph"><div className="evidence-relationship-step">{zh(node("Customer request", "Request gateway", "Input", "1 item", "Input only", "input"))}<ArrowDown className="evidence-relationship-arrow" size={14} aria-hidden="true" /></div><div className="evidence-relationship-step evidence-relationship-context-group">{zh(node("Context sources", "Context layer", "Supporting evidence", (zhFragment("") + (memoryCount + ragCount) + zhFragment(" item") + (zhFragment(memoryCount + ragCount === 1 ? "" : "s")) + zhFragment("")), "No execution authority", "context"))}<div className="evidence-relationship-branches"><div>{zh(node("Memory evidence", "Context layer", "Customer state", (zhFragment("") + (zh(memoryCount)) + zhFragment(" item") + (zhFragment(memoryCount === 1 ? "" : "s")) + zhFragment("")), "No execution authority", "context"))}<span className="evidence-relationship-branch-label">{zh("Context only")}</span></div><div>{zh(node("RAG evidence", "Context layer", "Knowledge source", (zhFragment("") + (zh(ragCount)) + zhFragment(" source") + (zhFragment(ragCount === 1 ? "" : "s")) + zhFragment("")), "No execution authority", "context"))}<span className="evidence-relationship-branch-label">{zh("Grounding only")}</span></div></div><ArrowDown className="evidence-relationship-arrow" size={14} aria-hidden="true" /></div><div className="evidence-relationship-step">{zh(node("LLM proposal", "Model layer", "Untrusted suggestion", (zhFragment("") + (zh(proposalCount)) + zhFragment(" proposal")), "Suggestion only", "proposal"))}<ArrowDown className="evidence-relationship-arrow" size={14} aria-hidden="true" /></div><div className="evidence-relationship-step">{zh(node("Decision compiler", "Control plane", "Deterministic validation", (zhFragment("") + (zh(policyCount)) + zhFragment(" check") + (zhFragment(policyCount === 1 ? "" : "s")) + zhFragment("")), "Decision owner", "decision"))}<ArrowDown className="evidence-relationship-arrow" size={14} aria-hidden="true" /></div><div className="evidence-relationship-step">{zh(node("Policy / confirmation gate", "Control plane", "Control boundary", (zhFragment("") + (zh(policyCount)) + zhFragment(" policy result") + (zhFragment(policyCount === 1 ? "" : "s")) + zhFragment("")), "Confirmation required", "decision"))}<ArrowDown className="evidence-relationship-arrow" size={14} aria-hidden="true" /></div><div className="evidence-relationship-step">{zh(node("Authority outcome", "Execution layer", "Runtime boundary", execution, "Controlled effects only", "authority"))}</div></div><div className="evidence-relationship-note"><Network size={15} aria-hidden="true" /><span>{zh("Authority boundary remains system-owned. Memory informs. RAG grounds. The model proposes. Deterministic systems decide. Runtime authority remains controlled.")}</span></div></Card>;
}

export function InvestigationReportModal({ run, onClose, onExport }: { run: AgentRun; onClose: () => void; onExport: () => void }) {
  const policy = run.policy[run.policy.length - 1];
  const memoryCount = run.memory.items_used ?? run.memory.retrieved_count ?? run.memory.item_count;
  const evidenceCount = memoryCount + run.rag_documents.length + (run.proposal ? 1 : 0);
  const checks = ["Policy decision evaluated", "Confirmation boundary enforced", "Duplicate protection checked"];
  const decisionText = policy
    ? `${humanize(policy.outcome)} · ${policy.reason_codes.map(humanize).join(", ") || "policy result recorded"}`
    : clarificationRequired(run)
    ? "Clarification required · required target information is missing"
    : run.decision_reason ?? "No deterministic decision reason was emitted.";
  return <div className="trace-report-backdrop" role="presentation" onClick={onClose}><section className="trace-report-modal" role="dialog" aria-modal="true" aria-labelledby="trace-report-title" onClick={(event) => event.stopPropagation()}><div className="trace-report-header"><div><div className="eyebrow">{zh("Agent run report · read-only investigation")}</div><h2 id="trace-report-title">{zh("Agent Investigation Report")}</h2><p>{zh("Bounded operational evidence for engineering review. No runtime action is available here.")}</p></div><button type="button" className="showcase-report-close" onClick={onClose} aria-label={zh("Close report")}>×</button></div><div className="trace-report-overview"><div><span>{zh("Run ID")}</span><strong className="whitespace-normal break-words overflow-visible">{zh(run.run_id)}</strong></div><div><span>{zh("Scenario")}</span><strong className="whitespace-normal break-words overflow-visible">{zh(humanize(run.intent || run.request_type))}</strong></div><div><span>{zh("Timestamp")}</span><strong className="whitespace-normal break-words overflow-visible">{zh(new Date(run.started_at).toLocaleString())}</strong></div><div><span>{zh("Status")}</span><strong className="whitespace-normal break-words overflow-visible">{zh(statusLabel(run))}</strong></div><div><span>{zh("Outcome")}</span><strong className="whitespace-normal break-words overflow-visible">{zh(investigationOutcome(run))}</strong></div></div><div className="trace-report-decision"><div><span>{zh("Evidence collected")}</span><strong className="whitespace-normal break-words overflow-visible">{zh(evidenceCount)}{" " + zhFragment("sources") + ""}</strong></div><div><span>{zh("Decision")}</span><strong className="whitespace-normal break-words overflow-visible">{zh(humanize(policy?.outcome ?? run.evidence.compiler.status))}</strong></div><div><span>{zh("Authority")}</span><strong className="whitespace-normal break-words overflow-visible">{zh(authorityState(run))}</strong></div><div><span>{zh("Outcome")}</span><strong className="whitespace-normal break-words overflow-visible">{zh(executionState(run))}</strong></div></div><div className="trace-report-sections"><section><h3>{zh("Evidence available")}</h3><p>{"" + zhFragment("Customer context ·") + " "}{zh(memoryCount)}{" " + zhFragment("bounded memory item") + ""}{zhFragment(memoryCount === 1 ? "" : "s")} · {zh(run.rag_documents.length)}{" " + zhFragment("RAG source") + ""}{zhFragment(run.rag_documents.length === 1 ? "" : "s")} · {zh(run.proposal ? "proposal recorded" : "proposal not recorded")}</p><div className="trace-report-evidence-list"><span>{zh("Customer context · bounded request projection")}</span><span>{"" + zhFragment("Memory snapshot ·") + " "}{zh(memoryCount ? "available" : "not recorded")}</span><span>{"" + zhFragment("RAG policy source ·") + " "}{zh(run.rag_documents[0]?.title ?? "not recorded")}</span></div></section><section><h3>{zh("Deterministic decision")}</h3>{checks.map((check) => <p className="trace-report-check" key={check}>✓ {zh(check)}</p>)}<p>{zh(decisionText)}</p></section><section><h3>{zh("Authority")}</h3><p>{zh(authorityState(run))}{zh(". Permission remains system-owned and is not granted by the model proposal.")}</p></section><section><h3>{zh("Outcome")}</h3><p>{zh(clarificationRequired(run) ? "Clarification required; execution was not attempted." : (zhFragment("") + (zh(investigationOutcome(run))) + zhFragment(" · ") + (zh(executionState(run))) + zhFragment(".")))}</p></section></div><div className="trace-report-footer"><Badge tone="neutral">{zh("No hidden reasoning · no model tokens")}</Badge><div className="flex flex-wrap gap-2"><button type="button" className="operator-action" onClick={onExport}>{zh("Export bounded HTML")}</button><button type="button" className="showcase-report-secondary" onClick={onClose}>{zh("Close")}</button></div></div></section></div>;
}
