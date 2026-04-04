"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CollabHeader, CollabPage, SectionCard } from "@/components/collab/layout";
import { collabTheme } from "@/components/collab/theme";
import { getCollabProfile, searchEmployeesByName } from "@/lib/collab-auth";

function getRoleLabel(type: unknown, observation: unknown) {
  const obs = String(observation ?? "").toLowerCase();
  if (obs.includes("coordinateur")) return "Coordinateur";
  if (String(type ?? "") === "E") return "Étudiant";
  if (String(type ?? "") === "S") return "Après-midi";
  return "Collaborateur";
}

export default function CollabLoginPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getCollabProfile()
      .then((profile) => {
        if (!profile || profile.role !== "collaborateur") return;
        router.replace(profile.first_login ? "/collab/change-pin" : "/collab/home");
      })
      .catch(() => undefined);
  }, [router]);

  useEffect(() => {
    if (!query.trim()) return;

    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void searchEmployeesByName(query)
        .then(setResults)
        .catch(() => setError("Impossible de rechercher les collaborateurs."))
        .finally(() => setLoading(false));
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const displayedResults = query.trim() ? results : [];

  return (
    <CollabPage>
      <CollabHeader title="Espace collaborateur" subtitle="Planning, absences et infos utiles au même endroit." />
      <SectionCard style={{ padding: "22px 18px", overflow: "hidden" }}>
        <div
          style={{
            margin: "-22px -18px 18px",
            padding: "18px 18px 16px",
            background:
              "radial-gradient(circle at top right, rgba(212,5,17,0.1) 0%, transparent 34%), linear-gradient(135deg, #fff7f4 0%, #fffdf9 100%)",
            borderBottom: `1px solid ${collabTheme.line}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                background: collabTheme.accent,
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                fontSize: 20,
                letterSpacing: "0.06em",
                boxShadow: "0 10px 18px rgba(212,5,17,0.18)",
              }}
            >
              É
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: collabTheme.accent, fontWeight: 800 }}>
                Application collaborateur
              </div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: collabTheme.text, fontFamily: collabTheme.titleFont }}>
                Choisissez votre profil
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: collabTheme.muted }}>
            Commencez à taper votre prénom pour retrouver votre accès, puis entrez votre code personnel.
          </div>
        </div>
        <label htmlFor="collab-name" style={{ display: "block", fontSize: 13, color: collabTheme.muted, marginBottom: 8, fontWeight: 700 }}>
          Rechercher votre prénom
        </label>
        <input
          id="collab-name"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value.toUpperCase();
            setQuery(nextQuery);
            if (!nextQuery.trim()) {
              setResults([]);
              setError("");
              setLoading(false);
            }
          }}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Ex. KAMEL"
          name="collab-search"
          style={{
            width: "100%",
            border: `1px solid ${collabTheme.line}`,
            borderRadius: 16,
            background: "#fffdfa",
            padding: "14px 16px",
            fontSize: 24,
            fontWeight: 700,
            color: collabTheme.text,
            outline: "none",
            caretColor: collabTheme.accent,
            fontFamily: "Georgia, serif",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        />
        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          {loading ? <div style={{ color: collabTheme.muted, fontSize: 13 }}>Recherche en cours...</div> : null}
          {error ? <div style={{ color: "#991b1b", fontSize: 13 }}>{error}</div> : null}
          {!loading && displayedResults.length === 0 && query.trim() ? (
            <div style={{ color: collabTheme.muted, fontSize: 13 }}>Aucun collaborateur trouvé.</div>
          ) : null}
          {displayedResults.map((employee) => {
            const name = String(employee.name ?? "");
            const initials = name.slice(0, 2).toUpperCase();
            const employeeId = String(employee.id ?? "");
            return (
              <button
                key={employeeId}
                type="button"
                onClick={() => router.push(`/collab/pin?name=${encodeURIComponent(name)}&employee_id=${encodeURIComponent(employeeId)}`)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr 20px",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 10px",
                  borderRadius: 18,
                  border: `1px solid ${collabTheme.line}`,
                  background: "#fffaf6",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 16, background: collabTheme.accentSoft, color: collabTheme.accent, display: "grid", placeItems: "center", fontWeight: 700 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: collabTheme.text }}>{name}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: collabTheme.muted }}>{getRoleLabel(employee.type, employee.observation)}</div>
                </div>
                <div style={{ color: collabTheme.accent, fontSize: 18 }}>›</div>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </CollabPage>
  );
}
