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
});
