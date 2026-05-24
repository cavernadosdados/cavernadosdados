import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Mirrors the uncontrolled Tabs pattern used in src/pages/Loja.tsx.
 * When parent state changes (e.g. a query refetches), Radix Tabs must
 * preserve the currently selected tab — otherwise the user is bounced
 * back to the default tab on every navigation/refetch.
 */
function LojaLikeTabs({ version }: { version: number }) {
  return (
    <Tabs defaultValue="glimer">
      <TabsList>
        <TabsTrigger value="glimer">Glimers</TabsTrigger>
        <TabsTrigger value="theme">Temas</TabsTrigger>
      </TabsList>
      <TabsContent value="glimer">glimers-panel v{version}</TabsContent>
      <TabsContent value="theme">temas-panel v{version}</TabsContent>
    </Tabs>
  );
}

function Harness() {
  const [version, setVersion] = useState(0);
  return (
    <div>
      <button data-testid="refetch" onClick={() => setVersion((v) => v + 1)}>
        refetch
      </button>
      <LojaLikeTabs version={version} />
    </div>
  );
}

describe("Loja sub-tab navigation preserves user state", () => {
  it("keeps the user on the selected sub-tab when the parent re-renders", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Default tab.
    expect(screen.getByText(/glimers-panel v0/)).toBeInTheDocument();

    // User switches to the Temas sub-tab.
    await user.click(screen.getByRole("tab", { name: "Temas" }));
    expect(screen.getByText(/temas-panel v0/)).toBeInTheDocument();

    // Simulate a background data refetch / parent re-render.
    await act(async () => {
      screen.getByTestId("refetch").click();
    });

    // The selected tab must remain "Temas" — no bounce back to "Glimers".
    expect(screen.getByText(/temas-panel v1/)).toBeInTheDocument();
    expect(screen.queryByText(/glimers-panel v1/)).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Temas" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});