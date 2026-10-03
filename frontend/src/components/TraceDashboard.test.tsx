import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AgentRun } from "../types";
import { TraceDashboard } from "./TraceDashboard";

const run = { run_id: "run-001", intent: "refund_order", request_type: "action", status: "completed", policy: [{ outcome: "allow" }], tools: [{ status: "executed" }], trace: [{ name: "respond" }] } as AgentRun;

describe("operational trace dashboard", () => {
  it("renders the bounded run index and trace availability", () => {
    const html = renderToStaticMarkup(<TraceDashboard runs={[run]} onSelect={() => undefined} />);
    expect(html).toContain("运行记录与链路");
    expect(html).toContain("退款申请");
    expect(html).toContain("可用");
    expect(html).not.toContain("SECRET_PAYLOAD");
  });

  it("renders explicit operator states", () => {
    expect(renderToStaticMarkup(<TraceDashboard runs={[]} loading onSelect={() => undefined} />)).toContain("正在加载证据快照…");
    expect(renderToStaticMarkup(<TraceDashboard runs={[]} error="backend unavailable" onSelect={() => undefined} />)).toContain("调查证据不可用");
    expect(renderToStaticMarkup(<TraceDashboard runs={[]} onSelect={() => undefined} />)).toContain("没有可用的已记录调查");
  });

  it("labels fixture-only filters and keeps the operator registry bounded", () => {
    const html = renderToStaticMarkup(<TraceDashboard runs={[run]} onSelect={() => undefined} />);
    expect(html).toContain("筛选条件应用于确定性证据快照。");
    expect(html).toContain("证据快照");
    expect(html).toContain("场景");
    expect(html).toContain("状态");
  });
});
