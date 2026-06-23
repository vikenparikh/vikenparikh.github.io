import { describe, it, expect } from "vitest";
import { siteConfig } from "../config";
import { generatedProjects } from "../generated/projects";

// These tests exercise the REAL project-list derivation in src/config.ts:
//   const projectList = generatedProjects.length > 0 ? generatedProjects : fallbackProjects;
//   projects: projectList, topProjects: projectList.slice(0, 6), otherProjects: projectList.slice(6)
// generatedProjects is a committed, non-empty `as const` array, so the live
// projectList === generatedProjects (the length > 0 branch).

describe("siteConfig project derivation", () => {
  it("uses generatedProjects (length > 0 branch), not the fallback list", () => {
    expect(generatedProjects.length).toBeGreaterThan(0);
    expect(siteConfig.projects.length).toBe(generatedProjects.length);
    expect(siteConfig.projects).toEqual(
      generatedProjects as unknown as typeof siteConfig.projects,
    );
  });

  it("topProjects is the first 6 projects", () => {
    expect(siteConfig.topProjects.length).toBe(6);
    expect(siteConfig.topProjects).toEqual(siteConfig.projects.slice(0, 6));
  });

  it("otherProjects is everything after the first 6", () => {
    expect(siteConfig.otherProjects.length).toBe(
      siteConfig.projects.length - 6,
    );
    expect(siteConfig.otherProjects).toEqual(siteConfig.projects.slice(6));
  });

  it("topProjects + otherProjects reconstitute projects with no overlap", () => {
    expect([...siteConfig.topProjects, ...siteConfig.otherProjects]).toEqual(
      siteConfig.projects,
    );

    const topNames = new Set(siteConfig.topProjects.map((p) => p.name));
    const otherNames = siteConfig.otherProjects.map((p) => p.name);
    for (const name of otherNames) {
      expect(topNames.has(name)).toBe(false);
    }
  });

  it("topProjects length is min(6, projects.length) and pins real first/sixth names", () => {
    expect(siteConfig.topProjects.length).toBe(
      Math.min(6, siteConfig.projects.length),
    );
    // Pinned from the committed generated/projects.ts ordering.
    expect(siteConfig.topProjects[0].name).toBe(generatedProjects[0].name);
    expect(siteConfig.topProjects[5].name).toBe(generatedProjects[5].name);
    expect(siteConfig.topProjects[0].name).toBe("Study Guides");
    expect(siteConfig.topProjects[5].name).toBe("Perplexica");
  });
});
