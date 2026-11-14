import { useState, type FormEvent } from "react";

export function Composer({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };
  return (
    <form className="composer" onSubmit={submit}>
      <input
        className="composer__input"
        aria-label="Message"
        placeholder="Ask about your money…"
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="composer__send" type="submit" disabled={disabled || !text.trim()}>
        Send
      </button>
    </form>
  );
}
