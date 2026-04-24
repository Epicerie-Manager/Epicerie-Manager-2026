"use client";

import type { CSSProperties } from "react";

export function PlanRayonConfirmModal({
  open,
  tone = "default",
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  tone?: "default" | "danger";
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle(tone)} onClick={(event) => event.stopPropagation()}>
        {tone === "danger" ? <div style={badgeStyle}>Confirmation</div> : null}
        <h3 style={titleStyle}>{title}</h3>
        <p style={descriptionStyle}>{description}</p>
        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} style={confirmButtonStyle(tone, pending)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  padding: 24,
  background: "rgba(15,23,42,0.42)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle = (tone: "default" | "danger"): CSSProperties => ({
  width: 460,
  maxWidth: "min(92vw, 460px)",
  borderRadius: 22,
  border: `1px solid ${tone === "danger" ? "#fecaca" : "#dbe3eb"}`,
  background: "#fff",
  boxShadow: "0 24px 60px rgba(15,23,42,0.22)",
  padding: 24,
  display: "grid",
  gap: 14,
});

const badgeStyle: CSSProperties = {
  width: "fit-content",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#fff1f2",
  color: "#d40511",
  fontSize: 11,
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 26,
  lineHeight: 1.1,
  color: "#13243b",
  fontFamily: "Fraunces, serif",
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
  color: "#64748b",
};

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 4,
};

const ghostButtonStyle: CSSProperties = {
  minHeight: 40,
  borderRadius: 10,
  border: "1px solid #d5d9e6",
  background: "#fff",
  color: "#475569",
  fontWeight: 700,
  padding: "0 14px",
};

const confirmButtonStyle = (tone: "default" | "danger", disabled: boolean): CSSProperties => ({
  minHeight: 40,
  borderRadius: 10,
  border: `1px solid ${tone === "danger" ? "#d40511" : "#0a4f98"}`,
  background: tone === "danger" ? "#d40511" : "#0a4f98",
  color: "#fff",
  fontWeight: 800,
  padding: "0 14px",
  opacity: disabled ? 0.7 : 1,
  cursor: disabled ? "not-allowed" : "pointer",
});
