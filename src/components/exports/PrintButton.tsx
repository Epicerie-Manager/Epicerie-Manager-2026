"use client";

import type { ReactNode } from "react";

type PrintButtonProps = {
  children: ReactNode;
  onClick: () => void;
};

export default function PrintButton({ children, onClick }: PrintButtonProps) {
  return (
    <button
      type="button"
      className="no-print"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 124,
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #b91c1c",
        background: "#d40511",
        color: "#ffffff",
        fontSize: 12,
        fontWeight: 800,
        boxShadow: "0 10px 20px rgba(212,5,17,0.15)",
      }}
    >
      {children}
    </button>
  );
}
