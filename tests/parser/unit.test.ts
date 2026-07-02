import { describe, it, expect } from "vitest";
import { assignNames } from "../../src/parser/naming.js";
import { assignPrimaryResponses } from "../../src/parser/responses.js";
import { selectPrimaryResponse } from "../../src/parser/types.js";
import type { ExtractedEndpoint } from "../../src/parser/types.js";

describe("Naming engine", () => {
  it("uses operationId when present", () => {
    const endpoints: ExtractedEndpoint[] = [
      makeEndpoint({ operationId: "getUser", method: "get", path: "/users" }),
    ];
    const named = assignNames(assignPrimaryResponses(endpoints));
    expect(named[0].id).toBe("get_user");
    expect(named[0].name).toBe("get_user");
  });

  it("deduplicates derived names with suffix", () => {
    const endpoints: ExtractedEndpoint[] = [
      makeEndpoint({ method: "post", path: "/users" }),
      makeEndpoint({ method: "post", path: "/users" }),
    ];
    const named = assignNames(assignPrimaryResponses(endpoints));
    expect(named.map((e) => e.id).sort()).toEqual(["post_users", "post_users_2"]);
  });
});

describe("Response selector", () => {
  it("selects 200 over others", () => {
    const primary = selectPrimaryResponse([
      { statusCode: "404", description: "Not found" },
      { statusCode: "200", description: "OK" },
    ]);
    expect(primary?.statusCode).toBe("200");
  });

  it("falls back to 201 then default", () => {
    expect(
      selectPrimaryResponse([{ statusCode: "201", description: "Created" }])?.statusCode,
    ).toBe("201");
    expect(
      selectPrimaryResponse([{ statusCode: "default", description: "Default" }])?.statusCode,
    ).toBe("default");
  });
});

function makeEndpoint(
  overrides: Partial<ExtractedEndpoint> & { method: string; path: string },
): ExtractedEndpoint {
  return {
    method: overrides.method as ExtractedEndpoint["method"],
    path: overrides.path,
    operationId: overrides.operationId,
    tags: [],
    deprecated: false,
    authentication: [],
    parameters: [],
    responses: overrides.responses ?? [{ statusCode: "200", description: "OK" }],
    summary: overrides.summary,
    description: overrides.description,
  };
}
