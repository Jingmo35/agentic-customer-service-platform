import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RagPanel } from "./RagPanel";

describe("RagPanel", () => {
  it("distinguishes an unrecorded retrieval stage from unavailable evidence", () => {
    const notRecorded = renderToStaticMarkup(<RagPanel documents={[]} embedded />);
    const unavailable = renderToStaticMarkup(<RagPanel documents={[]} retrievalRecorded embedded />);

    expect(notRecorded).toContain("未记录检索阶段");
    expect(unavailable).toContain("当前投影中没有可用证据");
    expect(notRecorded).toContain("知识检索");
  });

  it("labels returned document metadata as retrieved evidence", () => {
    const html = renderToStaticMarkup(<RagPanel documents={[{ citation_id: "ref-1", title: "Refund policy", section: "Eligibility", source: "policy", score: 0.91 }]} embedded />);

    expect(html).toContain("已检索证据");
    expect(html).toContain("知识检索");
    expect(html).toContain("退款政策");
  });

  it("shows bounded grounded-answer metrics without exposing claim text", () => {
    const html = renderToStaticMarkup(
      <RagPanel
        documents={[{ citation_id: "ref-1", title: "Refund policy", section: "Eligibility", source: "policy", score: 0.91 }]}
        grounding={{ status: "pass", sources_used: 1, citation_count: 1, citation_coverage: 1, unsupported_claim_count: 0, confidence: 0.91, accepted: true }}
        embedded
      />,
    );

    expect(html).toContain("有依据回答校验");
    expect(html).toContain("已使用来源");
    expect(html).toContain("缺少依据的断言");
    expect(html).toContain("91%");
    expect(html).not.toContain("无隐藏推理 · 无模型 Token");
  });
});
