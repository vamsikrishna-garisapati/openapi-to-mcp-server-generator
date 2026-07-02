import { describe, it, expect } from "vitest";
import { success, failure, mergeResults } from "../../src/utils/result.js";

describe("Result utilities", () => {
  it("creates success results", () => {
    const result = success({ id: 1 }, [{ code: "P001", message: "warn" }]);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1 });
    expect(result.warnings).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("creates failure results", () => {
    const result = failure([{ code: "E001", message: "error" }]);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it("merges results", () => {
    const merged = mergeResults([
      success(null, [{ code: "P001", message: "w1" }]),
      failure([{ code: "E001", message: "e1" }]),
    ]);
    expect(merged.warnings).toHaveLength(1);
    expect(merged.errors).toHaveLength(1);
  });
});
