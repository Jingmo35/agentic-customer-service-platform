import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { MemoryRecord, MemoryUsage } from "../types";
import { MemoryPanel } from "./MemoryPanel";

const usage: MemoryUsage = {
  item_count: 1,
  keys: ["response_style"],
  types: ["preference"],
  retrieved: true,
  retrieved_count: 1,
  items_used: 1,
  purpose: "context_enrichment",
  decision_influence: "context_only",
  authority_influence: "none",
};

const record: MemoryRecord = {
  id: 17,
  customer_id: 3,
  memory_type: "preference",
  normalized_key: "response_style",
  source: "user_explicit",
  status: "active",
  created_at: "2026-01-20T00:00:00Z",
  updated_at: "2026-01-21T00:00:00Z",
  expires_at: "2027-01-20T00:00:00Z",
};

describe("MemoryPanel", () => {
  it("renders operational metadata without a memory body", () => {
    const html = renderToStaticMarkup(
      <MemoryPanel usage={usage} records={[record]} embedded />,
    );

    expect(html).toContain("response_style");
    expect(html).toContain("user explicit");
    expect(html).toContain("2027-01-20T00:00:00.000Z");
    expect(html).toContain("记忆可补充上下文，但不能授权操作或绕过校验与确认。操作员视图投影中不公开记忆内容。");
    expect(html).toContain("决策影响");
    expect(html).toContain("仅用于上下文");
    expect(html).toContain("无影响");
    expect(html).toContain("记忆作用");
    expect(html).toContain("仅补充上下文");
    expect(html).toContain("客户状态");
    expect(html).toContain("客户偏好补充");
    expect(html).toContain("上下文组装");
    expect(html).not.toContain("PRIVATE_MEMORY_SENTINEL_DO_NOT_EXPOSE");
  });

  it("preserves the empty state", () => {
    const html = renderToStaticMarkup(
      <MemoryPanel usage={{ item_count: 0, keys: [], types: [] }} records={[]} embedded />,
    );

    expect(html).toContain("未找到持久化记忆");
  });
});
