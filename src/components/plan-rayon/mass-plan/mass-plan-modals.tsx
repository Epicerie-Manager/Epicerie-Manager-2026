"use client";

import type { CSSProperties } from "react";

export function NewPlanModal({
  open,
  name,
  width,
  height,
  pending,
  onClose,
  onNameChange,
  onWidthChange,
  onHeightChange,
  onSubmit,
}: {
  open: boolean;
  name: string;
  width: number;
  height: number;
  pending: boolean;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={titleStyle}>Nouveau plan</h3>
        <p style={subStyle}>Créez une nouvelle surface de travail pour le magasin ou un univers précis.</p>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={fieldStyle}>
            <span>Nom du plan</span>
            <input value={name} onChange={(event) => onNameChange(event.target.value)} style={inputStyle} placeholder="Ex: Plan global" />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={fieldStyle}>
              <span>Largeur</span>
              <input type="number" value={width} onChange={(event) => onWidthChange(Number(event.target.value))} style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Hauteur</span>
              <input type="number" value={height} onChange={(event) => onHeightChange(Number(event.target.value))} style={inputStyle} />
            </label>
          </div>
        </div>
        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={ghostStyle}>Annuler</button>
          <button type="button" onClick={onSubmit} disabled={pending || !name.trim()} style={primaryStyle(pending || !name.trim())}>
            {pending ? "Création..." : "Créer le plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeletePlanModal({
  open,
  planName,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  planName: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div style={overlayStyle}>
      <div style={dangerModalStyle}>
        <div style={dangerBadgeStyle}>Suppression</div>
        <h3 style={titleStyle}>Supprimer ce plan ?</h3>
        <p style={subStyle}>
          Le plan <strong>{planName}</strong> sera supprimé définitivement. Cette action ne pourra pas être annulée.
        </p>
        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={ghostStyle}>
            Annuler
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} style={dangerStyle(pending)}>
            {pending ? "Suppression..." : "Supprimer le plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImportPlanModal({
  open,
  pending,
  sourcePlanId,
  mode,
  options,
  onClose,
  onSourcePlanChange,
  onModeChange,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  sourcePlanId: string;
  mode: "append" | "replace";
  options: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSourcePlanChange: (value: string) => void;
  onModeChange: (value: "append" | "replace") => void;
  onSubmit: () => void;
}) {
  if (!open) return null;
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={titleStyle}>Importer un autre plan</h3>
        <p style={subStyle}>
          Reprenez un plan déjà commencé pour l’ajouter au plan courant ou remplacer entièrement son contenu.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={fieldStyle}>
            <span>Plan source</span>
            <select value={sourcePlanId} onChange={(event) => onSourcePlanChange(event.target.value)} style={inputStyle}>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={choiceStyle(mode === "append")}>
              <input type="radio" name="import-mode" checked={mode === "append"} onChange={() => onModeChange("append")} />
              <span>
                <strong>Fusionner dans le plan courant</strong>
                <small style={choiceHintStyle}>Le plan importé est posé en bloc avec un décalage automatique.</small>
              </span>
            </label>
            <label style={choiceStyle(mode === "replace")}>
              <input type="radio" name="import-mode" checked={mode === "replace"} onChange={() => onModeChange("replace")} />
              <span>
                <strong>Remplacer le plan courant</strong>
                <small style={choiceHintStyle}>Le contenu actuel est vidé puis remplacé par le plan source.</small>
              </span>
            </label>
          </div>
        </div>
        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={ghostStyle}>Annuler</button>
          <button type="button" onClick={onSubmit} disabled={pending || !sourcePlanId} style={primaryStyle(pending || !sourcePlanId)}>
            {pending ? "Import..." : "Importer le plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.42)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 400,
  padding: 20,
};

const modalStyle: CSSProperties = {
  width: 520,
  maxWidth: "95vw",
  borderRadius: 18,
  background: "#fff",
  padding: 24,
  boxShadow: "0 24px 60px rgba(15,23,42,0.22)",
  display: "grid",
  gap: 16,
};

const dangerModalStyle: CSSProperties = {
  ...modalStyle,
  width: 460,
  border: "1px solid #fecaca",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontFamily: "Fraunces, serif",
  color: "#13243b",
};

const subStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#64748b",
  lineHeight: 1.6,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 42,
  borderRadius: 10,
  border: "1px solid #d5d9e6",
  padding: "0 12px",
  fontSize: 14,
  color: "#13243b",
};

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const choiceStyle = (active: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "start",
  gap: 10,
  borderRadius: 12,
  border: `1px solid ${active ? "#fca5a5" : "#e2e8f0"}`,
  background: active ? "#fff5f5" : "#fff",
  padding: "12px 14px",
  color: "#13243b",
  cursor: "pointer",
});

const choiceHintStyle: CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: 12,
  lineHeight: 1.5,
  color: "#64748b",
};

const ghostStyle: CSSProperties = {
  minHeight: 40,
  borderRadius: 10,
  border: "1px solid #d5d9e6",
  background: "#fff",
  color: "#475569",
  fontWeight: 700,
  padding: "0 14px",
};

const primaryStyle = (disabled: boolean): CSSProperties => ({
  minHeight: 40,
  borderRadius: 10,
  border: "1px solid #d40511",
  background: "#d40511",
  color: "#fff",
  fontWeight: 800,
  padding: "0 14px",
  opacity: disabled ? 0.7 : 1,
  cursor: disabled ? "not-allowed" : "pointer",
});

const dangerBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#fff1f2",
  color: "#d40511",
  fontSize: 11,
  fontWeight: 800,
  width: "fit-content",
};

const dangerStyle = (disabled: boolean): CSSProperties => ({
  minHeight: 40,
  borderRadius: 10,
  border: "1px solid #d40511",
  background: "#d40511",
  color: "#fff",
  fontWeight: 800,
  padding: "0 14px",
  opacity: disabled ? 0.7 : 1,
  cursor: disabled ? "not-allowed" : "pointer",
});
