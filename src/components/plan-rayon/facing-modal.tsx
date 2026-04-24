"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { RayonPlanItem } from "@/lib/plans-rayon-db";

export function FacingModal({
  open,
  rayon,
  canWrite,
  signedUrl,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  rayon: RayonPlanItem | null;
  canWrite: boolean;
  signedUrl: string | null;
  pending: boolean;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setPreviewUrl(null);
      setDragOver(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !canWrite) return;

    const onPaste = (event: ClipboardEvent) => {
      const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) => item.type.startsWith("image/"));
      const imageFile = imageItem?.getAsFile();
      if (!imageFile) return;
      setFile(imageFile);
      setPreviewUrl(URL.createObjectURL(imageFile));
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, canWrite]);

  const title = useMemo(() => {
    if (!rayon) return "Facing du rayon";
    return `${rayon.name} — ${rayon.elem_count} éléments`;
  }, [rayon]);

  if (!open || !rayon) return null;

  const activePreview = previewUrl || signedUrl;

  const handleFile = (nextFile: File | null) => {
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) return;
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <h3 style={titleStyle}>📷 Facing du rayon</h3>
            <p style={subtitleStyle}>{title}</p>
          </div>
          <button type="button" onClick={onClose} style={closeStyle}>✕</button>
        </div>
        <div style={bodyStyle}>
          {activePreview ? (
            <div style={{ borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", background: "#f8fafc", fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                <span>Aperçu de l'image</span>
                {canWrite ? (
                  <button type="button" onClick={() => { setFile(null); setPreviewUrl(null); }} style={changeStyle}>✕ Changer</button>
                ) : null}
              </div>
              <div style={{ height: 220, background: "#f4f6f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={activePreview} alt={rayon.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
            </div>
          ) : null}

          {canWrite ? (
            <>
              {!previewUrl ? (
                <label
                  style={{
                    ...dropZoneStyle,
                    borderColor: dragOver ? "#d40511" : "#d5d9e6",
                    background: dragOver ? "#fff0f1" : "#fafbfc",
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragOver(false);
                    handleFile(event.dataTransfer.files[0] ?? null);
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                    onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
                  />
                  <div style={{ fontSize: 34 }}>🖼</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#13243b" }}>Déposez l'image ici</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>PNG, JPG ou capture d'écran</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 14 }}>
                    {["📂 Parcourir", "🖱 Glisser", "Ctrl+V Coller"].map((entry) => (
                      <span key={entry} style={pillStyle}>{entry}</span>
                    ))}
                  </div>
                </label>
              ) : null}
              <div style={hintStyle}>
                Faites une capture d'écran de votre PDF puis collez-la ici avec <strong>Ctrl+V</strong>.
              </div>
            </>
          ) : null}
        </div>
        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>Fermer</button>
          {canWrite ? (
            <button
              type="button"
              onClick={() => file && void onSave(file)}
              disabled={!file || pending}
              style={primaryButtonStyle(!file || pending)}
            >
              {pending ? "Enregistrement..." : "Enregistrer le facing"}
            </button>
          ) : null}
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
  width: 620,
  maxWidth: "96vw",
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
  gap: 14,
  padding: 24,
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

const dropZoneStyle: CSSProperties = {
  position: "relative",
  border: "2px dashed #d5d9e6",
  borderRadius: 14,
  padding: "34px 20px",
  textAlign: "center",
  cursor: "pointer",
  display: "grid",
  gap: 8,
};

const pillStyle: CSSProperties = {
  minHeight: 28,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 700,
};

const hintStyle: CSSProperties = {
  borderRadius: 12,
  border: "1px solid #bae6fd",
  background: "#f0f9ff",
  color: "#0369a1",
  fontSize: 12,
  lineHeight: 1.5,
  padding: "10px 12px",
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

const changeStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#d40511",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};
