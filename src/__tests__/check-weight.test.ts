import { describe, it, expect } from "vitest";
// check-weight.mjs runs in the frontend CI gate after every build. Its budget
// logic is pure — test it directly so a silent regression can't let the
// perf-weight protection quietly stop biting.
import { evaluate, measure, BUDGETS, kb } from "../../scripts/check-weight.mjs";

const under = {
  pages: [{ path: "dist/index.html", size: 10_000 }],
  cssTotal: 10_000,
  jsTotal: 0,
  images: [{ path: "dist/a.png", size: 10_000 }],
};

describe("evaluate", () => {
  it("passes when everything is under budget", () => {
    expect(evaluate(under)).toEqual([]);
  });
  it("flags a page over the HTML budget", () => {
    const issues = evaluate({ ...under, pages: [{ path: "dist/big.html", size: BUDGETS.htmlPage + 1 }] });
    expect(issues.some((i) => i.startsWith("page dist/big.html"))).toBe(true);
  });
  it("flags CSS over budget", () => {
    expect(evaluate({ ...under, cssTotal: BUDGETS.cssTotal + 1 }).some((i) => i.startsWith("total CSS"))).toBe(true);
  });
  it("flags JS over budget", () => {
    expect(evaluate({ ...under, jsTotal: BUDGETS.jsTotal + 1 }).some((i) => i.startsWith("total JS"))).toBe(true);
  });
  it("flags a single oversized image", () => {
    const issues = evaluate({ ...under, images: [{ path: "dist/huge.png", size: BUDGETS.singleImage + 1 }] });
    expect(issues.some((i) => i.startsWith("image dist/huge.png"))).toBe(true);
  });
  it("treats the budget as inclusive (exactly at budget passes)", () => {
    expect(evaluate({ ...under, cssTotal: BUDGETS.cssTotal })).toEqual([]);
  });
  it("reports every violation at once", () => {
    expect(
      evaluate({
        pages: [{ path: "p", size: BUDGETS.htmlPage + 1 }],
        cssTotal: BUDGETS.cssTotal + 1,
        jsTotal: BUDGETS.jsTotal + 1,
        images: [{ path: "i", size: BUDGETS.singleImage + 1 }],
      }).length,
    ).toBe(4);
  });
});

describe("measure", () => {
  it("buckets files by extension and sums bundles", () => {
    // measure() stats real paths, so point it at this repo's own files (any
    // existing files work — we only assert bucketing, not exact sizes).
    const m = measure(["package.json", "README.md"]);
    expect(m.pages).toEqual([]); // neither is .html
    expect(m.cssTotal).toBe(0);
    expect(typeof m.jsTotal).toBe("number");
  });
});

describe("kb", () => {
  it("formats bytes as KB to one decimal", () => {
    expect(kb(1536)).toBe("1.5 KB");
  });
});
