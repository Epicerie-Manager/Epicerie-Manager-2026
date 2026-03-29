"use client";

import { collabCardStyle, collabTheme } from "@/components/collab/theme";

const keypadRows = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "back"],
];

const keypadLetters: Record<string, string> = {
  "2": "abc",
  "3": "def",
  "4": "ghi",
  "5": "jkl",
  "6": "mno",
  "7": "pqrs",
  "8": "tuv",
  "9": "wxyz",
};

export function PinDots({ value, length = 4 }: { value: string; length?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "16px 0 22px" }}>
      {Array.from({ length }).map((_, index) => {
        const filled = index < value.length;
        return (
          <span
            key={index}
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: filled ? collabTheme.accent : "transparent",
              border: `2px solid ${filled ? collabTheme.accent : collabTheme.line}`,
              transition: "all 0.15s ease",
            }}
          />
        );
      })}
    </div>
  );
}

export function NumericKeypad({
  onDigit,
  onBackspace,
  disabled,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {keypadRows.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {row.map((item) => {
            if (!item) return <div key={`${rowIndex}-empty`} />;
            if (item === "back") {
              return (
                <button
                  key="back"
                  type="button"
                  onClick={onBackspace}
                  disabled={disabled}
                  style={{
                    ...collabCardStyle({
                      minHeight: 72,
                      cursor: disabled ? "not-allowed" : "pointer",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 22,
                    }),
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={collabTheme.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21 4-9 0-7 8 7 8h9a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
                    <path d="m18 9-6 6" />
                    <path d="m12 9 6 6" />
                  </svg>
                </button>
              );
            }
            return (
              <button
                key={item}
                type="button"
                onClick={() => onDigit(item)}
                disabled={disabled}
                style={{
                  ...collabCardStyle({
                    minHeight: 72,
                    cursor: disabled ? "not-allowed" : "pointer",
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                  }),
                }}
              >
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: collabTheme.text }}>{item}</div>
                  <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: collabTheme.muted }}>
                    {keypadLetters[item] ?? ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
