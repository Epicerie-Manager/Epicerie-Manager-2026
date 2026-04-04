"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCollabProfile, searchEmployeesByName } from "@/lib/collab-auth";
import packageJson from "../../../../package.json";

const RED = "#D40511";
const PAGE_BG = "#F4F1ED";
const CARD_BG = "#FAFAF8";
const CARD_LINE = "#EDEBE7";
const TEXT = "#1a1410";

function getRoleLabel(type: unknown, observation: unknown) {
  const obs = String(observation ?? "").toLowerCase();
  if (obs.includes("coordinateur")) return "Coordinateur";
  if (String(type ?? "") === "E") return "Étudiant";
  if (String(type ?? "") === "S") return "Équipe après-midi";
  return "Équipe matin";
}

function searchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="#C8C5C0" strokeWidth="1.8" />
      <path d="M16 16L21 21" stroke="#C8C5C0" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
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
    <section
      style={{
        minHeight: "100dvh",
        background: PAGE_BG,
        fontFamily: "var(--font-dm-sans), sans-serif",
        color: TEXT,
      }}
    >
      <div
        style={{
          width: "min(100%, 390px)",
          minHeight: "100dvh",
          margin: "0 auto",
          padding: "10px 14px 0",
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
      >
        <div
          style={{
            background: RED,
            borderRadius: 36,
            padding: "26px 24px 46px",
            color: "#fff",
            boxShadow: "0 20px 44px rgba(212,5,17,0.14)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                background: "rgba(255,255,255,0.2)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontFamily: "var(--font-fraunces), serif",
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              É
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
              Épicerie · Villebon 2
            </div>
          </div>
          <div
            style={{
              marginTop: 18,
              fontFamily: "var(--font-fraunces), serif",
              fontSize: 30,
              lineHeight: 0.96,
              fontWeight: 650,
              color: "#fff",
              textWrap: "balance",
            }}
          >
            Espace
            <br />
            collaborateur
          </div>
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.84)" }}>
            Planning, absences et infos utiles.
          </div>
        </div>

        <div
          style={{
            marginTop: -28,
            background: CARD_BG,
            borderRadius: "28px 28px 30px 30px",
            border: `1px solid ${CARD_LINE}`,
            padding: "22px 18px 24px",
            position: "relative",
            zIndex: 1,
            boxShadow: "0 16px 42px rgba(60,40,20,0.05)",
            minHeight: 0,
            display: "grid",
            alignContent: "start",
          }}
        >
          <div style={{ fontSize: 13, color: "#777", lineHeight: 1.5, marginBottom: 14 }}>
            Tapez les premières lettres de votre prénom et sélectionnez votre compte.
          </div>

          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              {searchIcon()}
            </span>
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
              placeholder="Ex. Obi-Wan"
              name="collab-search"
              style={{
                width: "100%",
                minHeight: 52,
                border: "0.5px solid #E0DDD8",
                borderRadius: 13,
                background: "#FFFFFF",
                colorScheme: "light",
                padding: "0 16px 0 42px",
                fontSize: 15,
                fontWeight: 500,
                color: TEXT,
                outline: "none",
                fontFamily: "var(--font-dm-sans), sans-serif",
                boxShadow: "none",
              }}
            />
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {loading ? <div style={{ color: "#777", fontSize: 13 }}>Recherche en cours...</div> : null}
            {error ? <div style={{ color: "#991b1b", fontSize: 13 }}>{error}</div> : null}
            {!loading && displayedResults.length === 0 && query.trim() ? (
              <div style={{ color: "#777", fontSize: 13 }}>Aucun collaborateur trouvé.</div>
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
                    gridTemplateColumns: "38px 1fr 14px",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px",
                    borderRadius: 14,
                    border: `0.5px solid ${CARD_LINE}`,
                    background: "#FFFFFF",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                      background: "#FEF2F2",
                      border: "1px solid #FDDADA",
                      color: RED,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {initials}
                    </div>
                    <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>{name}</div>
                    <div style={{ marginTop: 1, fontSize: 12, color: "#b7b2ab" }}>{getRoleLabel(employee.type, employee.observation)}</div>
                  </div>
                  <div style={{ color: "#DDD", fontSize: 18 }}>›</div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 18, textAlign: "center", fontSize: 11, color: "#ccc" }}>Version {packageJson.version}</div>
        </div>
      </div>
    </section>
  );
}
