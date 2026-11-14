import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "../App";

describe("/dev/gallery", () => {
  it("renders the transaction_list mock", () => {
    render(<MemoryRouter initialEntries={["/dev/gallery"]}><App /></MemoryRouter>);
    expect(screen.getByRole("region", { name: "Latest transactions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /see all/i })).toBeInTheDocument();
  });
});
