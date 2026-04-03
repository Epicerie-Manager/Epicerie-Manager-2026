"use client";

import type { ReactNode } from "react";
import PrintButton from "@/components/exports/PrintButton";

type PeriodSelectorProps = {
  formats?: { label: string; value: string }[];
  selectedFormat?: string;
  onFormatChange?: (value: string) => void;
  periodLabel: string;
  periodSub: string;
  onPrev: () => void;
  onNext: () => void;
  onPrint: () => void;
  children?: ReactNode;
};

export default function PeriodSelector({
  formats,
  selectedFormat,
  onFormatChange,
  periodLabel,
  periodSub,
  onPrev,
  onNext,
  onPrint,
  children,
}: PeriodSelectorProps) {
  return (
    <div
      className="no-print ctrl-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        padding: "10px 14px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {formats?.length ? (
          <div
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 3,
              borderRadius: 999,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
            }}
          >
            {formats.map((format) => {
              const active = format.value === selectedFormat;
              return (
                <button
                  key={format.value}
                  type="button"
                  onClick={() => onFormatChange?.(format.value)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    background: active ? "#ede9fe" : "transparent",
                    color: active ? "#4c1d95" : "#64748b",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {format.label}
                </button>
              );
            })}
          </div>
        ) : null}
        {children}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginLeft: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={onPrev}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "#ffffff",
              border: "1px solid #dbe3eb",
              color: "#475569",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            ‹
          </button>
          <div style={{ minWidth: 160, textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{periodLabel}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{periodSub}</div>
          </div>
          <button
            type="button"
            onClick={onNext}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "#ffffff",
              border: "1px solid #dbe3eb",
              color: "#475569",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            ›
          </button>
        </div>
        <PrintButton onClick={onPrint}>Imprimer</PrintButton>
      </div>
    </div>
  );
}
