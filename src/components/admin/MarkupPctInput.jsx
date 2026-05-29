import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * MarkupPctInput
 * --------------
 * A numeric % input that:
 *   • Stores the displayed string LOCALLY while the user is typing
 *     (so intermediate values like "", "1", "1.", "175." work without
 *      being clobbered by the parent's parse → reformat round-trip).
 *   • Commits to the parent only on blur or Enter, by calling
 *     onCommit(pctString). Parent converts pct → multiplier on commit.
 *   • Re-syncs with the parent value when it changes from outside
 *     (e.g. after Save All reload).
 *
 * Props:
 *   value        — current multiplier (number, e.g. 3.0 → "300.0")
 *   onCommit     — (pctString) => void
 *   className    — passthrough for styling
 *   placeholder  — passthrough
 */
export default function MarkupPctInput({ value, onCommit, className, placeholder = "0" }) {
  const toDisplay = (mult) =>
    mult === undefined || mult === null || mult === "" ? "" : (mult * 100).toFixed(1);

  const [draft, setDraft] = useState(toDisplay(value));

  // Re-sync if the parent value changes from outside (e.g. reload after save).
  useEffect(() => {
    setDraft(toDisplay(value));
  }, [value]);

  const commit = () => {
    onCommit(draft);
    // Normalize the visible value to match what the parent will store
    const n = parseFloat(draft);
    setDraft(isFinite(n) ? n.toFixed(1) : "");
  };

  return (
    <Input
      type="number"
      step="0.1"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className={className}
      placeholder={placeholder}
    />
  );
}