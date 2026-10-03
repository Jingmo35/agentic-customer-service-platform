import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AgentRun } from "../types";
import { DecisionExplanationCard, DecisionLifecycleSummary, EvidenceRelationshipGraph, InvestigationReportModal, OperationalTraceTimeline, TraceInvestigationHeader } from "./TraceInvestigation";

const run: AgentRun = {
  run_id: "agent_run_8f31a2",
  request_id: "request-001",
  conversation_id: "conversation-001",
  action_id: "action-001",
  customer_id: 1,
  intent: "refund_request",
  request_type: "write_action",
  status: "waiting_confirmation",
  started_at: "2026-08-23T09:00:00Z",
  duration_ms: 842,
  trace_id: "trace-8f31a2",
  path: [],
  failure_category: null,
  recovery_action: null,
  degraded_components: [],
  memory: { item_count: 1, keys: ["refund_preference"], types: ["customer_preference"], retrieved: true, retrieved_count: 1, items_used: 1, context_usage: "context_enrichment", purpose: "context_enrichment", decision_influence: "context_only", authority_influence: "none" },
  tools: [],
  policy: [{ action_id: "action-001", tool_name: "refund.create", risk_level: 2, outcome: "require_confirmation", reason_codes: ["confirmation_required"] }],
  rag_documents: [{ citation_id: "refund-policy", title: "Refund Policy v3", section: "Defective products", source: "refund_policy_v3.md", score: 0.91, grounding_status: "validated" }],
  retrieval_metadata: { backend: "recorded_demo", embedding_provider: "not_applicable", reranker_enabled: false, retrieval_count: 1, latency_seconds: 0, fallback_status: "not_applicable", hybrid: false, fusion_strategy: "not_applicable", dense_candidate_count: 0, sparse_candidate_count: 0 },
  trace: [],
  decision_reason: "Customer confirmation required before mutation.",
  evidence: { grounding: { status: "validated", reference_type: "rag", trusted_source: "refund_policy_v3.md" }, compiler: { status: "passed", selected_tool: "refund.create", requires_retrieval: true, reason: "Target and required fields validated." }, target_validation: { status: "validated" }, confirmation: { status: "pending", required: true, action_id: "action-001", risk_level: 2 }, write_outcome: { status: "pending_confirmation" } },
  proposal: { intent: "refund_request", suggested_action: "refund.create", extracted_fields: {}, evidence_references: ["refund-policy"], validation: "passed" },
};

describe("trace investigation surface", () => {
  it("renders header, decision explanation, relationship graph, and operational stages", () => {
    const html = renderToStaticMarkup(<><TraceInvestigationHeader run={run} /><DecisionLifecycleSummary run={run} /><OperationalTraceTimeline run={run} /><DecisionExplanationCard run={run} /><EvidenceRelationshipGraph run={run} /></>);
    expect(html).toContain("链路调查");
    expect(html).toContain("已收到请求");
    expect(html).toContain("已接受请求");
    expect(html).toContain("参与方 / 层");
    expect(html).toContain("已解析知识来源");
    expect(html).toContain("已记录操作建议");
    expect(html).toContain("已评估策略决策");
    expect(html).toContain("结果");
    expect(html).toContain("未尝试执行");
    expect(html).toContain("已加载记忆快照");
    expect(html).toContain("已解析知识来源");
    expect(html).toContain("决策编译器");
    expect(html).toContain("为何做出此决策？");
    expect(html).toContain("证据 · 已通过检查");
    expect(html).toContain("决策生命周期");
    expect(html).toContain("未满足确认要求，因此未授予执行权限。");
    expect(html).toContain("证据关系");
    expect(html).toContain("执行权限边界");
    expect(html).toContain("记忆证据");
    expect(html).toContain("决策编译器");
    expect(html).toContain("证据快照元数据");
  });

  it("renders a bounded report modal without hidden reasoning", () => {
    const html = renderToStaticMarkup(<InvestigationReportModal run={run} onClose={() => undefined} onExport={() => undefined} />);
    expect(html).toContain("Agent 调查报告");
    expect(html).toContain("已收集证据");
    expect(html).toContain("证据可用");
    expect(html).toContain("确定性决策");
    expect(html).toContain("权限");
    expect(html).toContain("结果");
    expect(html).toContain("无隐藏推理 · 无模型 Token");
    expect(html).not.toContain("chain_of_thought");
    expect(html).not.toContain("raw_provider_response");
  });
});
