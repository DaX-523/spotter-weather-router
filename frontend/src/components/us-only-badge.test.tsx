import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UsOnlyBadge } from "@/components/us-only-badge";

describe("UsOnlyBadge", () => {
  it("says the app plans US trips, in US units and local time", () => {
    render(<UsOnlyBadge />);

    expect(screen.getByText("US routes only")).toBeInTheDocument();
    expect(screen.getByText("mi · °F · lb · local time")).toBeInTheDocument();
  });
});
