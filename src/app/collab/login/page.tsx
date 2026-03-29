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
      <CollabHeader title="Bonjour." subtitle="Retrouvez votre planning, vos absences et vos informations utiles depuis votre espace collaborateur." />
      <SectionCard style={{ padding: "22px 18px" }}>
        <label htmlFor="collab-name" style={{ display: "block", fontSize: 13, color: collabTheme.muted, marginBottom: 8 }}>
          Entrez les premières lettres de votre prénom
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
          placeholder=""
          name="collab-search"
          style={{
            width: "100%",
            border: "none",
            borderBottom: `2px solid ${collabTheme.accent}`,
            background: "transparent",
            padding: "10px 0 12px",
            fontSize: 26,
            fontWeight: 700,
            color: collabTheme.text,
            outline: "none",
            caretColor: collabTheme.accent,
            fontFamily: "Georgia, serif",
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
            return (
              <button
                key={String(employee.id)}
                type="button"
                onClick={() => router.push(`/collab/pin?name=${encodeURIComponent(name)}`)}
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
