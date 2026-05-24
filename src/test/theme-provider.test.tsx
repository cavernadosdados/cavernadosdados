import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";

// --- Mocks ----------------------------------------------------------------

const mockEquipped = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}));

vi.mock("@/hooks/useEquippedCosmetics", () => ({
  useEquippedCosmetics: () => mockEquipped(),
}));

function NavButton({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)} data-testid={label}>
      {label}
    </button>
  );
}

function App() {
  return (
    <MemoryRouter initialEntries={["/a"]}>
      <ThemeProvider>
        <NavButton to="/b" label="go-b" />
        <NavButton to="/a" label="go-a" />
        <Routes>
          <Route path="/a" element={<div>page-a</div>} />
          <Route path="/b" element={<div>page-b</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

// --- Tests ----------------------------------------------------------------

describe("ThemeProvider — stable theme across navigation (no flash)", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("style");
    mockEquipped.mockReset();
  });

  it("does NOT strip pre-applied tokens while the query is still loading", () => {
    // Simulate bootstrap: tokens applied synchronously from localStorage.
    document.documentElement.style.setProperty("--primary", "255 80% 68%");
    document.documentElement.setAttribute("data-theme", "glimer-aurora");
    localStorage.setItem(
      "glimer:theme",
      JSON.stringify({
        slug: "glimer-aurora",
        tokens: { "--primary": "255 80% 68%" },
      })
    );

    mockEquipped.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
    });

    render(<App />);

    // ThemeProvider must not touch the DOM while still loading — the
    // bootstrapped values must remain intact.
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "255 80% 68%"
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "glimer-aurora"
    );
  });

  it("persists the resolved theme to localStorage and keeps it applied after navigation", () => {
    mockEquipped.mockReturnValue({
      data: {
        glimer_slug: null,
        glimer_image_url: null,
        frame_slug: null,
        frame_image_url: null,
        cover_slug: null,
        cover_image_url: null,
        theme_slug: "glimer-cobalt",
        theme_tokens: null,
      },
      isLoading: false,
      isFetching: false,
    });

    const { getByTestId } = render(<App />);

    // Initial render applies the theme.
    expect(document.documentElement.getAttribute("data-theme")).toBe("glimer-cobalt");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "217 91% 60%"
    );

    // Persisted for the next page load (no flash on refresh).
    const persisted = JSON.parse(localStorage.getItem("glimer:theme") || "{}");
    expect(persisted.slug).toBe("glimer-cobalt");
    expect(persisted.tokens["--primary"]).toBe("217 91% 60%");

    // Navigate between routes; tokens must remain applied (no flicker).
    act(() => {
      getByTestId("go-b").click();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("glimer-cobalt");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "217 91% 60%"
    );

    act(() => {
      getByTestId("go-a").click();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("glimer-cobalt");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "217 91% 60%"
    );
  });
});