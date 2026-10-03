import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArchitectureOverview } from "./ArchitectureOverview";
import { OverviewDashboard } from "./OverviewDashboard";

describe("platform presentation surfaces", () => {
  it("keeps overview metrics bounded when no run projection is available", () => {
    const html = renderToStaticMarkup(<OverviewDashboard runs={[]} busy={false} onRunSafetyDemo={async () => undefined} onNavigate={() => undefined} />);
    expect(html).toContain("Agent 平台");
    expect(html).toContain("从请求追踪到证据");
    expect(html).toContain("LLM 提出建议，确定性系统做出决策");
    expect(html).toContain("不可用");
    expect(html).toContain("RELEASE_GATE_PASS");
    expect(html).toContain("当前校验状态");
    expect(html).toContain("系统保障");
    expect(html).toContain("上下文完整性");
    expect(html).toContain("执行权限边界");
    expect(html).not.toContain("fake");
  });

  it("renders the documented execution authority boundary", () => {
    const html = renderToStaticMarkup(<ArchitectureOverview />);
    expect(html).toContain("LLM 不掌管执行权限");
    expect(html).toContain("来源校验");
    expect(html).toContain("策略与确认");
    expect(html).toContain("补充上下文");
    expect(html).toContain("记忆");
    expect(html).toContain("RAG 证据");
    expect(html).toContain("证据输入");
    expect(html).toContain("辅助信息，绝不掌管执行权限。");
    expect(html).toContain("决策");
    expect(html).toContain("权限");
    expect(html).toContain("为什么 LLM 不掌管执行权限");
    expect(html).toContain("有效退款申请");
  });
});
