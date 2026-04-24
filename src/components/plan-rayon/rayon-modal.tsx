"use client";

import type { CSSProperties } from "react";

const COLOR_OPTIONS = ["#0a4f98", "#d71920", "#059669", "#7c3aed", "#d97706", "#0891b2", "#be185d", "#374151", "#92400e", "#ec4899"];

export function RayonModal({
  open,
  pending,
  universeName,
  name,
  elemCount,
  color,
  onClose,
  onNameChange,
  onElemCountChange,
  onColorChange,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  universeName: string;
  name: string;
  elemCount: number;
  color: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onElemCountChange: (value: number) => void;
  onColorChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <h3 style={titleStyle}>Nouveau rayon</h3>
            <p style={subtitleStyle}>Ajoutez un rayon à "{universeName}".</p>
          </div>
          <button type="button" onClick={onClose} style={closeStyle}>✕</button>
        </div>
        <div style={bodyStyle}>
          <label style={fieldStyle}>
            <span>Nom</span>
            <input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="ex. Céréales" style={inputStyle} />
          </label>
          <label style={fieldStyle}>
            <span>Nombre d'éléments</span>
            <input
              type="number"
              min={1}
              max={30}
              value={elemCount}
              onChange={(event) => onElemCountChange(Number(event.target.value))}
              style={inputStyle}
            />
          </label>
          <div style={fieldStyle}>
            <span>Couleur</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {COLOR_OPTIONS.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => onColorChange(entry)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: `3px solid ${color === entry ? "#13243b" : "transparent"}`,
                    background: entry,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>Annuler</button>
          <button type="button" onClick={onSubmit} disabled={pending || !name.trim()} style={primaryButtonStyle(pending || !name.trim())}>
            {pending ? "Ajout..." : "Ajouter le rayon"}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.4)",
  backdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 300,
  padding: 20,
};

const modalStyle: CSSProperties = {
  width: 520,
  maxWidth: "95vw",
  borderRadius: 24,
  border: "1px solid #e2e8f0",
  background: "#fff",
  boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  padding: "24px 24px 0",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: "Fraunces, serif",
  fontSize: 24,
  color: "#13243b",
};

const subtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 13,
  color: "#64748b",
};

const bodyStyle: CSSProperties = {
  display: "grid",
  gap: 18,
  padding: 24,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
};

const inputStyle: CSSProperties = {
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid #d5d9e6",
  padding: "0 12px",
  fontSize: 14,
  color: "#13243b",
};

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  padding: "0 24px 24px",
};

const closeStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#64748b",
  cursor: "pointer",
};

const ghostButtonStyle: CSSProperties = {
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid #d5d9e6",
  background: "#fff",
  color: "#475569",
  fontSize: 13,
  fontWeight: 700,
  padding: "0 14px",
  cursor: "pointer",
};

const primaryButtonStyle = (disabled: boolean): CSSProperties => ({
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid #d40511",
  background: "#d40511",
  color: "#fff",
  fontSize: 13,
  fontWeight: 800,
  padding: "0 14px",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.7 : 1,
});
