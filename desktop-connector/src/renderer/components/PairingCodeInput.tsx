import { useRef } from "react";
import { cn } from "../lib/utils";

export function normalizePairingDraft(value: string): string { return value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6); }

const pairingPositions = ["first", "second", "third", "fourth", "fifth", "sixth"] as const;

export function PairingCodeInput({ value, onChange, disabled, invalid }: { value: string; onChange: (value: string) => void; disabled?: boolean; invalid?: boolean }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const setCharacter = (index: number, text: string) => {
    const normalized = normalizePairingDraft(text);
    if (!normalized) return;
    const next = value.split("");
    const character = normalized.at(-1)!;
    if (index < next.length) next[index] = character;
    else next.push(character);
    onChange(next.slice(0, 6).join(""));
    refs.current[Math.min(index + 1, 5)]?.focus();
  };
  return <div className="flex justify-center gap-2" aria-label="Six-character pairing code">
    {pairingPositions.map((position, index) => <input
      key={position}
      ref={(node) => { refs.current[index] = node; }}
      value={value[index] ?? ""}
      autoFocus={index === 0}
      disabled={disabled}
      inputMode="text"
      autoCapitalize="characters"
      aria-label={`Pairing code character ${index + 1}`}
      aria-invalid={invalid}
      className={cn("h-[52px] w-11 rounded-md border border-line bg-black/25 text-center font-mono text-xl font-medium uppercase text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20", invalid && "border-red-500/70 focus:border-red-500 focus:ring-red-500/20")}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setCharacter(index, event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Backspace") {
          event.preventDefault();
          const next = value.split("");
          if (next[index]) next.splice(index, 1); else if (index > 0) { next.splice(index - 1, 1); refs.current[index - 1]?.focus(); }
          onChange(next.join(""));
        } else if (event.key === "ArrowLeft") refs.current[Math.max(0, index - 1)]?.focus();
        else if (event.key === "ArrowRight") refs.current[Math.min(5, index + 1)]?.focus();
      }}
      onPaste={(event) => {
        const pasted = normalizePairingDraft(event.clipboardData.getData("text"));
        if (!pasted) return;
        event.preventDefault(); onChange(pasted); refs.current[Math.min(pasted.length, 5)]?.focus();
      }}
    />)}
  </div>;
}
