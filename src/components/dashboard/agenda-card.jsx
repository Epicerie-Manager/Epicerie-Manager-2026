"use client";

/**
 * AgendaCard — Carte Google Calendar pour le Dashboard
 * 
 * INSTRUCTIONS CODEX :
 * - Ajouter cette carte dans la colonne DROITE du dashboard existant
 * - La placer entre "Note du jour" et "Balisage"
 * - NE PAS modifier les autres cartes du dashboard
 * - Adapter les imports et le styling au système existant (Tailwind/CSS modules)
 * - Les données mockées seront remplacées par l'API Google Calendar
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */
// Types pour TypeScript - Codex adaptera
// interface CalendarEvent {
//   id: string;
//   title: string;
//   startTime: string;   // "7h00"
//   endTime: string;     // "7h15"
//   type: 'meeting' | 'delivery' | 'task' | 'personal';
//   color: string;       // hex
//   isAllDay?: boolean;
//   location?: string;
//   description?: string;
// }

/* ═══════════════════════════════════════════════════════════
   MOCK DATA — à remplacer par l'API Google Calendar
   ═══════════════════════════════════════════════════════════ */
const MOCK_EVENTS = [
  { id: "1", title: "Point équipe matin", heure: "7h00 – 7h15", startHour: 7, type: "meeting", color: "#1d5fa0" },
  { id: "2", title: "Réception livraison Lactalis", heure: "8h30 – 9h00", startHour: 8, type: "delivery", color: "#0f766e" },
  { id: "3", title: "Passage responsable régional", heure: "10h00 – 11h00", startHour: 10, type: "meeting", color: "#b91c2e" },
  { id: "4", title: "Implantation Chocolat Pâques", heure: "11h00 – 12h00", startHour: 11, type: "task", color: "#c05a0c" },
  { id: "5", title: "Déjeuner", heure: "12h30 – 13h30", startHour: 12, type: "personal", color: "#94a3b8" },
  { id: "6", title: "Visio RH — entretiens annuels", heure: "14h00 – 15h00", startHour: 14, type: "meeting", color: "#5635b8" },
];

/* ═══════════════════════════════════════════════════════════
   ICONS par type d'événement (Lucide SVG inline)
   ═══════════════════════════════════════════════════════════ */
const EventIcon = ({ type, color, size = 13 }) => {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (type) {
    case "meeting":
      return <svg {...props}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
    case "delivery":
      return <svg {...props}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
    case "task":
      return <svg {...props}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  }
};

/* ═══════════════════════════════════════════════════════════
   AGENDA CARD COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function AgendaCard({ events = MOCK_EVENTS, calendarUrl = "https://calendar.google.com" }) {
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [apiEvents, setApiEvents] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const currentHour = now ? now.getHours() : -1;
  const displayedEvents = connected ? apiEvents : events;

  const firstRelevantIndex = displayedEvents.findIndex((ev) => ev.startHour >= currentHour - 1);
  const compactStartIndex =
    firstRelevantIndex >= 0
      ? firstRelevantIndex
      : Math.max(displayedEvents.length - 3, 0);
  const compactEvents = displayedEvents.slice(compactStartIndex, compactStartIndex + 3);
  const visibleEvents = showAll ? displayedEvents : compactEvents;

  useEffect(() => {
    let active = true;
    fetch("/api/calendar/today", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("not connected");
        const data = await res.json();
        if (!active) return;
        setApiEvents(Array.isArray(data) ? data : []);
        setConnected(true);
      })
      .catch(() => {
        if (!active) return;
        setConnected(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div style={{
      background: "rgba(255,255,255,0.96)",
      border: "1px solid #dbe3eb",
      borderRadius: 24,
      boxShadow: "0 16px 36px rgba(19,36,59,0.08)",
      padding: 18,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "5px 14px", borderRadius: 10,
          background: "#edf5ff", color: "#0a4f98",
          fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
        }}>
          {/* Calendar icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a4f98" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>AGENDA</span>
        </div>
        {/* Connexion indicator */}
        {connected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 8, height: 8, borderRadius: 4, background: "#16a34a",
              animation: "gcal-pulse 2s infinite",
            }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: "#16a34a" }}>Google Calendar</span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              style={{
                marginLeft: 4,
                fontSize: 10,
                fontWeight: 700,
                color: "#64748b",
                border: "1px solid #dbe3eb",
                background: "#f8fafc",
                borderRadius: 8,
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              Se déconnecter
            </button>
            <style>{`@keyframes gcal-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        ) : (
          <Link
            href="/api/auth/signin/google?callbackUrl=%2F"
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#0a4f98",
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              borderRadius: 8,
              padding: "4px 8px",
              textDecoration: "none",
            }}
          >
            Se connecter
          </Link>
        )}
      </div>

      {/* Title */}
      <h2 style={{ margin: "10px 0 4px", fontSize: 21, fontWeight: 700, letterSpacing: "-0.03em", color: "#13243b" }}>
        Aujourd&apos;hui
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "#617286" }}>
        {displayedEvents.length} événement{displayedEvents.length > 1 ? "s" : ""} programmé{displayedEvents.length > 1 ? "s" : ""}
      </p>

      {/* Events list */}
      <div style={{ display: "grid", gap: 6 }}>
        {loading ? (
          <>
            {[1, 2, 3].map((skeleton) => (
              <div
                key={skeleton}
                style={{
                  height: 52,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "linear-gradient(90deg, #f8fafc 0%, #eef2f7 50%, #f8fafc 100%)",
                }}
              />
            ))}
          </>
        ) : displayedEvents.length === 0 ? (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #dbe3eb",
              background: "#f8fafc",
              padding: "12px 14px",
              fontSize: 12,
              color: "#64748b",
            }}
          >
            Aucun événement aujourd&apos;hui.
          </div>
        ) : visibleEvents.map(ev => {
          const isPast = ev.startHour < currentHour - 1;
          const isCurrent = ev.startHour >= currentHour - 1 && ev.startHour <= currentHour;

          return (
            <div key={ev.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              borderRadius: 14, 
              background: isCurrent ? `${ev.color}08` : "#fbfcfd",
              border: `1px solid ${isCurrent ? ev.color + "25" : "#dbe3eb"}`,
              borderLeft: `3px solid ${ev.color}${isPast ? "40" : ""}`,
              borderRadius: "0 14px 14px 0",
              opacity: isPast ? 0.45 : 1,
              transition: "all 0.15s",
            }}>
              {/* Icon */}
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: isCurrent ? `${ev.color}15` : `${ev.color}08`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <EventIcon type={ev.type} color={ev.color} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: isCurrent ? 700 : 600,
                  color: isCurrent ? ev.color : "#1e293b", lineHeight: 1.2,
                }}>
                  {ev.title}
                </div>
                <div style={{ fontSize: 11, color: "#617286", marginTop: 1 }}>{ev.heure}</div>
              </div>

              {/* "En cours" badge */}
              {isCurrent && (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: "#fff",
                  background: ev.color, padding: "2px 8px", borderRadius: 6, flexShrink: 0,
                }}>
                  En cours
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!loading && displayedEvents.length > 3 ? (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          style={{
            display: "block",
            width: "100%",
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #dbe3eb",
            background: "#f8fafc",
            color: "#0a4f98",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showAll ? "Afficher moins" : "Afficher plus"}
        </button>
      ) : null}

      {/* Footer link */}
      {calendarUrl && (
        <a href={calendarUrl} target="_blank" rel="noopener noreferrer" style={{
          display: "block", marginTop: 12, padding: "10px 14px", borderRadius: 12,
          background: "#f8fafc", border: "1px solid #dbe3eb", textAlign: "center",
          textDecoration: "none", fontSize: 12, fontWeight: 600, color: "#0a4f98",
          transition: "background 0.15s",
        }}>
          Voir le calendrier complet →
        </a>
      )}
    </div>
  );
}
