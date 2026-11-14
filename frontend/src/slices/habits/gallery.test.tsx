import { render, screen } from "@testing-library/react-native";

import WidgetGallery from "../../../app/dev/gallery";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
}));

describe("/dev/gallery", () => {
  it("lists all five habits widgets with a mock", () => {
    render(<WidgetGallery />);
    for (const t of ["limit_suggestion", "limit_progress", "limit_review", "challenge_suggestions", "challenge_progress"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    expect(screen.queryByText("No mock yet.")).toBeNull();
  });

  it("lists the experiment states and the concept notes", () => {
    render(<WidgetGallery />);
    for (const name of [
      "concept_note",
      "challenge_progress (won)",
      "challenge_progress (lost, spent more)",
      "concept_note (small_purchases_add_up)",
      "concept_note (compare_equal_periods)",
      "concept_note (fixed_vs_everyday)",
      "concept_note (spending_pace)",
      "concept_note (one_week_is_not_proof)",
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getByText("Target met")).toBeTruthy();
    expect(screen.getByText("Target not met")).toBeTruthy();
  });
});
