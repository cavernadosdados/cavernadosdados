import { describe, it, expect, beforeEach } from "vitest";

/**
 * Mirrors the inline <script> in index.html. Kept in sync so the test
 * exercises the exact bootstrap behavior. If you change the script in
 * index.html, update this function as well.
 */
function runBootstrap() {
  try {
    const raw = localStorage.getItem("glimer:theme");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.tokens) return;
    const root = document.documentElement;
    Object.keys(parsed.tokens).forEach((k) => {
      root.style.setProperty(k, parsed.tokens[k]);
    });
    if (parsed.slug) root.setAttribute("data-theme", parsed.slug);
  } catch {}
}

describe("theme bootstrap (no flash on load)", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("style");
  });

  it("applies persisted theme tokens to <html> synchronously before React renders", () => {
    localStorage.setItem(
      "glimer:theme",
      JSON.stringify({
        slug: "glimer-aurora",
        tokens: {
          "--background": "240 35% 6%",
          "--primary": "255 80% 68%",
        },
      })
    );

    runBootstrap();

    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBe("glimer-aurora");
    expect(root.style.getPropertyValue("--background")).toBe("240 35% 6%");
    expect(root.style.getPropertyValue("--primary")).toBe("255 80% 68%");
  });

  it("is a no-op when nothing is persisted (uses :root defaults)", () => {
    runBootstrap();
    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBeNull();
    expect(root.style.getPropertyValue("--background")).toBe("");
  });

  it("does not throw and does not pollute the DOM on corrupted storage", () => {
    localStorage.setItem("glimer:theme", "{not json");
    expect(() => runBootstrap()).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });
});