"use client";

type PrintHeaderProps = {
  title: string;
  dates: string;
  printedAt?: string;
};

export default function PrintHeader({ title, dates, printedAt }: PrintHeaderProps) {
  const printedLabel =
    printedAt ||
    new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        paddingBottom: 8,
        marginBottom: 8,
        borderBottom: "2px solid #d40511",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 5,
          background: "#d40511",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: "-0.03em",
        }}
        >
          É
        </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Épicerie Villebon 2</div>
        <div style={{ fontSize: 10, color: "#64748b" }}>Auchan — Planning équipe</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#d40511" }}>{title}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", marginTop: 1 }}>{dates}</div>
        <div style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>Imprimé le {printedLabel}</div>
      </div>
    </div>
  );
}
