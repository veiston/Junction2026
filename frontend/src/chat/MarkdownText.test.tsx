import { render, screen } from "@testing-library/react-native";
import { MarkdownText, parseBlocks, parseInline } from "./MarkdownText";

describe("Markdown parser and component", () => {
  it("parses inline bold and normal text", () => {
    const nodes = parseInline("**Track your spending** and recent transactions");
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ type: "bold" });
    expect(nodes[1]).toMatchObject({ type: "text", value: " and recent transactions" });
  });

  it("parses headings and bullet lists", () => {
    const text = `Here are some things we can look at together:
- **Track your spending** and recent transactions
- **Review your monthly income** and recurring expenses
- **Set up savings goals** and build better money habits

What would you like to check first?`;

    const blocks = parseBlocks(text);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[1].type).toBe("bullet_list");
    if (blocks[1].type === "bullet_list") {
      expect(blocks[1].items).toHaveLength(3);
    }
    expect(blocks[2].type).toBe("paragraph");
  });

  it("renders markdown correctly in React Native component", () => {
    const text = `Moi! I'm your S-Money Coach.
- **Track your spending** and recent transactions`;

    render(<MarkdownText content={text} />);

    expect(screen.getByText("Moi! I'm your S-Money Coach.")).toBeTruthy();
    expect(screen.getByText("Track your spending")).toBeTruthy();
    expect(screen.getByText(/and recent transactions/)).toBeTruthy();
  });
});
