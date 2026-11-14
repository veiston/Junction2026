import type { QuickAction } from "../contracts-temp";

const CHIPS: { action: QuickAction; label: string }[] = [
  { action: "understand_my_money", label: "Understand my money" },
  { action: "plan_my_finances", label: "Plan my finances" },
  { action: "improve_my_habits", label: "Improve my habits" },
];

export function QuickActions({ onChip, disabled }: { onChip: (a: QuickAction) => void; disabled?: boolean }) {
  return (
    <div className="chips" role="group" aria-label="Suggested actions">
      {CHIPS.map((c) => (
        <button key={c.action} type="button" className="chip" disabled={disabled} onClick={() => onChip(c.action)}>
          {c.label}
        </button>
      ))}
    </div>
  );
}
