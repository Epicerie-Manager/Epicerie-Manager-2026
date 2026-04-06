import Link from "next/link";
import { helpTutorials } from "./tutorials";

function cardStyle(accent: string, light: string): React.CSSProperties {
  return {
    borderRadius: 24,
    padding: "22px",
    background: `linear-gradient(180deg, #ffffff 0%, ${light} 100%)`,
    border: `1px solid ${light}`,
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
    display: "grid",
    gap: 14,
  };
}

export default function HelpPage() {
  return (
    <section style={{ display: "grid", gap: 18, paddingTop: 18 }}>
      <div
        style={{
          borderRadius: 28,
          padding: "26px 28px",
          background:
            "radial-gradient(circle at top right, rgba(20,184,166,0.12) 0%, transparent 30%), linear-gradient(135deg, #ffffff 0%, #f4fbfb 100%)",
          border: "1px solid rgba(207,250,254,0.9)",
          boxShadow: "0 16px 44px rgba(15,23,42,0.06)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f766e" }}>
          Centre d&apos;aide
        </div>
        <h1 style={{ marginTop: 10, fontSize: 34, lineHeight: 1.02, letterSpacing: "-0.06em", color: "#0f172a" }}>
          Tutoriels prêts pour l&apos;aide et la présentation
        </h1>
        <p style={{ marginTop: 12, maxWidth: 760, fontSize: 15, lineHeight: 1.7, color: "#475569" }}>
          Cette section regroupe les démonstrations consultables directement dans l&apos;application bureau.
          Elles peuvent servir d&apos;aide à l&apos;utilisation, de support de présentation ou de lien à partager aux collègues,
          collaborateurs et à la direction.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {helpTutorials.map((tutorial) => (
          <article key={tutorial.slug} style={cardStyle(tutorial.accent, tutorial.light)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: tutorial.accent }}>
                {tutorial.audience}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: tutorial.accent,
                  background: "#ffffff",
                  border: `1px solid ${tutorial.accent}22`,
                  borderRadius: 999,
                  padding: "6px 10px",
                }}
              >
                HTML intégré
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.05em", color: "#0f172a" }}>{tutorial.title}</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#475569" }}>{tutorial.description}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link
                href={`/aide/${tutorial.slug}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 44,
                  padding: "0 16px",
                  borderRadius: 999,
                  textDecoration: "none",
                  background: tutorial.accent,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  boxShadow: "0 12px 24px rgba(15,23,42,0.12)",
                }}
              >
                Ouvrir dans l&apos;app
              </Link>
              <a
                href={tutorial.htmlPath}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 44,
                  padding: "0 16px",
                  borderRadius: 999,
                  textDecoration: "none",
                  background: "#ffffff",
                  color: tutorial.accent,
                  border: `1px solid ${tutorial.accent}33`,
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Ouvrir en plein écran
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
