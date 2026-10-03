import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentPlayground } from "./AgentPlayground";

describe("playground showcase scenarios", () => {
  it("exposes context and authority-boundary inputs without fabricating results", () => {
    const html = renderToStaticMarkup(<AgentPlayground busy={false} error={null} execution={null} onRun={async () => undefined} onClear={() => undefined} />);
    expect(html).toContain("记忆 · 已保存偏好（替换）");
    expect(html).toContain("RAG · 退款策略");
    expect(html).toContain("提示词注入尝试");
    expect(html).toContain("受保护的变更在满足确认条件前不会执行。");
    expect(html).toContain("选择场景仅填充输入，不执行请求，也不编造结果。");
    expect(html).not.toContain("fake execution result");
  });
});
