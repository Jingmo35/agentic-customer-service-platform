import { zh, zhFragment } from "../i18n";
import { Brain } from "lucide-react";
import type { MemoryRecord, MemoryUsage } from "../types";
import { Badge, EmptyState, Panel, SectionHeader, StatusIndicator } from "./ui";

function formatTimestamp(value: string | null): string {
  return value ? new Date(value).toISOString() : "no expiration";
}

function memoryCount(usage: MemoryUsage): number {
  return usage.retrieved_count ?? usage.items_used ?? usage.item_count;
}

function memoryLabel(value: string | undefined, fallback: string): string {
  return value ? value.replace(/_/g, " ") : fallback;
}

function memoryPurpose(value: string | undefined, retrieved: boolean): string {
  if (!retrieved) return "Not used";
  if (value === "context_enrichment") return "Customer preference enrichment";
  return memoryLabel(value, "Not recorded");
}

export function MemoryPanel({
  usage,
  records,
  embedded = false,
}: {
  usage: MemoryUsage;
  records: MemoryRecord[];
  embedded?: boolean;
}) {
  const retrievedCount = memoryCount(usage);
  const retrieved = usage.retrieved ?? retrievedCount > 0;
  const purpose = memoryPurpose(usage.purpose ?? usage.context_usage, retrieved);
  const decisionImpact = memoryLabel(usage.decision_influence, retrieved ? "context only" : "not used");
  const authorityImpact = usage.authority_influence === "none" ? "No impact" : memoryLabel(usage.authority_influence, "Not applicable");
  const content = (
    <>
      <div className="notice notice-info">
        <Brain size={15} aria-hidden="true" />
        <span>{zh("Memory can enrich context but cannot authorize actions or bypass validation and confirmation. Memory content is intentionally hidden from the operator projection.")}</span>
      </div>
      <div className="mt-4">
        <div className="context-role-header">
          <div className="flex flex-wrap items-center gap-2">
            <div className="eyebrow">{zh("Memory context")}</div>
            <Badge tone="info">{zh("CUSTOMER STATE")}</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{zh("User-specific preferences and bounded context for contextual continuity.")}</p>
          <div className="mt-2 text-[11px] text-muted">{zh(retrievedCount)}{" " + zhFragment("item") + ""}{zh(retrievedCount === 1 ? "" : "s")}{" " + zhFragment("used in run") + ""}</div>
        </div>
        <div className="context-summary mt-3">
          <div><span className="field-label">{zh("Retrieved")}</span><div className="mt-1 text-xs text-main">{zh(retrieved ? (zhFragment("✓ ") + (zh(retrievedCount)) + zhFragment("")) : "Not used")}</div></div>
          <div><span className="field-label">{zh("Why memory was loaded")}</span><div className="mt-1 text-xs text-main">{zh(purpose)}</div></div>
          <div><span className="field-label">{zh("Used by")}</span><div className="mt-1 text-xs text-main">{zh(retrieved ? "Context assembly" : "Not used")}</div></div>
          <div><span className="field-label">{zh("Decision impact")}</span><div className="mt-1 text-xs capitalize text-main">{zh(decisionImpact)}</div></div>
          <div><span className="field-label">{zh("Execution authority")}</span><div className="mt-1 text-xs text-main">{zh(authorityImpact)}</div></div>
        </div>
        <div className="memory-role-card mt-3">
          <div><span className="field-label">{zh("Memory role")}</span><div className="mt-1 text-sm font-medium text-main">{zh("Context enrichment only")}</div></div>
          <div className="memory-role-grid mt-3"><div><span className="field-label">{zh("Used for")}</span><div className="mt-1 text-xs text-muted">{zh("Personalization · contextual continuity")}</div></div><div><span className="field-label">{zh("Not used for")}</span><div className="mt-1 text-xs text-muted">{zh("Authorization · policy override · execution authority · confirmation bypass")}</div></div></div>
        </div>
        <div className="context-summary mt-3"><div><span className="field-label">{zh("Retrieved keys")}</span><div className="mt-1 text-xs text-main">{zh(usage.keys.length ? usage.keys.join(" · ") : "Not recorded")}</div></div><div><span className="field-label">{zh("Context types")}</span><div className="mt-1 text-xs text-main">{zh(usage.types.length ? usage.types.join(" · ") : "Not recorded")}</div></div><div><span className="field-label">{zh("Previous interactions")}</span><div className="mt-1 text-xs text-muted">{zh("Unavailable in current projection")}</div></div></div>
        {records.length === 0 ? (
          <EmptyState
            title={zh("No persistent memory found")}
            description={zh("This customer has no visible active memory records.")}
            icon={Brain}
          />
        ) : (
          <div className="mt-3 space-y-2">
            {records.map((record) => (
              <div className="memory-row" key={record.id}>
                <div>
                  <div className="text-sm font-medium text-main">
                    {zh(record.memory_type.replace(/_/g, " "))}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted">
                    {zh(record.normalized_key)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted">{"" + zhFragment("Source ·") + " "}{zh(record.source.replace(/_/g, " "))}{" " + zhFragment("· provenance recorded") + ""}</div>
                  <div className="mt-1 text-[11px] text-muted">{zh("Created")}{zh(formatTimestamp(record.created_at))}{" " + zhFragment("· updated") + ""}{zh(" ")}
                    {zh(formatTimestamp(record.updated_at))}{" " + zhFragment("· expires") + " "}{zh(formatTimestamp(record.expires_at))}
                  </div>
                </div>
                <StatusIndicator label={zh(record.status)} tone="success" compact />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
  return embedded ? (
    <div>{zh(content)}</div>
  ) : (
    <Panel title={zh("Customer memory")} eyebrow={zh("Contextual evidence")}>
      <SectionHeader
        title={zh("Personalization context")}
        description={zh("Customer-scoped metadata approved by the memory policy.")}
      />
      {zh(content)}
    </Panel>
  );
}
