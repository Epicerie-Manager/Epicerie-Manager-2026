import Link from "next/link";
import { notFound } from "next/navigation";
import { getHelpTutorial, helpTutorials } from "../tutorials";

export function generateStaticParams() {
  return helpTutorials.map((tutorial) => ({ slug: tutorial.slug }));
}

export default async function HelpTutorialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tutorial = getHelpTutorial(slug);

  if (!tutorial) {
    notFound();
  }

  return (
    <section style={{ display: "grid", gap: 16, paddingTop: 18 }}>
      <div
        style={{
          borderRadius: 28,
          padding: "22px 24px",
          background: `linear-gradient(135deg, ${tutorial.light} 0%, #ffffff 100%)`,
          border: `1px solid ${tutorial.accent}22`,
          boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: tutorial.accent }}>
              {tutorial.audience}
            </div>
            <h1 style={{ marginTop: 8, fontSize: 32, lineHeight: 1.02, letterSpacing: "-0.06em", color: "#0f172a" }}>
              {tutorial.title}
            </h1>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link
              href="/aide"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 42,
                padding: "0 14px",
                borderRadius: 999,
                textDecoration: "none",
                background: "#ffffff",
                color: "#334155",
                border: "1px solid #dbe3eb",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Retour aux tutoriels
            </Link>
            <a
              href={tutorial.htmlPath}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 42,
                padding: "0 14px",
                borderRadius: 999,
                textDecoration: "none",
                background: tutorial.accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Ouvrir seul
            </a>
          </div>
        </div>
        <p style={{ margin: 0, maxWidth: 860, fontSize: 14, lineHeight: 1.7, color: "#475569" }}>
          {tutorial.description}
        </p>
      </div>

      <div
        style={{
          borderRadius: 28,
          overflow: "hidden",
          border: "1px solid rgba(219,227,235,0.95)",
          background: "#ffffff",
          boxShadow: "0 18px 42px rgba(15,23,42,0.08)",
        }}
      >
        <iframe
          title={tutorial.title}
          src={tutorial.htmlPath}
          style={{
            width: "100%",
            height: "calc(100vh - 240px)",
            minHeight: "820px",
            border: "none",
            display: "block",
            background: "#000",
          }}
        />
      </div>
    </section>
  );
}
