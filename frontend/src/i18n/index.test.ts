import { describe, expect, it } from "vitest";
import { zh, zhFragment } from "./index";

describe("Chinese display localization boundary", () => {
  it("translates controls and semantic statuses without changing their source", () => {
    const status = "waiting_confirmation";
    expect(zh("Send")).toBe("发送");
    expect(zh(status)).toBe("等待确认");
    expect(status).toBe("waiting_confirmation");
  });

  it("preserves unknown text, identifiers and structured API payloads", () => {
    const payload = { message: "Please inspect order 77499", execution_mode: "recorded_replay" };
    expect(zh(payload)).toBe(payload);
    expect(zh(payload.message)).toBe(payload.message);
    expect(zh("run_77499")).toBe("run_77499");
    expect(zh(0)).toBe(0);
    expect(zh(null)).toBe(null);
  });

  it("separates display plural fragments from standalone units", () => {
    expect(zh("s")).toBe("s");
    expect(zhFragment("s")).toBe("");
  });
});
