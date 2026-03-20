import { tgEntries, tgWeeks } from "@/lib/tg-data";

const activeWeek = tgWeeks[0];
const activeEntries = tgEntries.filter((entry) => entry.weekId === activeWeek.id);
const groupedRayons = Array.from(new Set(activeEntries.map((entry) => entry.rayon))).map(
  (rayon) => ({
    rayon,
    entries: activeEntries.filter((entry) => entry.rayon === rayon),
  }),
);

const tgCount = activeEntries.filter((entry) => entry.type === "TG").length;
const gbCount = activeEntries.filter((entry) => entry.type === "GB").length;
const managers = Array.from(new Set(activeEntries.map((entry) => entry.manager)));

export default function PlanTgPage() {
  return (
    <section className="module-layout">
      <header className="module-hero">
        <p className="eyebrow">Module V1</p>
        <h1>Plan TG / GB</h1>
        <p>
          Cette vue reprend l&apos;esprit de lecture manager propose dans les
          maquettes : semaine visible tout de suite, synthese rapide et cartes
          rayon faciles a scanner sur PC et tablette.
        </p>
      </header>

      <div className="planning-summary-grid">
        <article className="module-card">
          <p className="panel-kicker">Semaine active</p>
          <h2>{activeWeek.label}</h2>
          <p>Periode actuellement mise en avant dans la vue manager.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Lignes TG</p>
          <h2>{tgCount}</h2>
          <p>Actions tete de gondole a suivre en priorite.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Lignes GB</p>
          <h2>{gbCount}</h2>
          <p>Gondoles basses et ilots promo visibles en complément.</p>
        </article>
        <article className="module-card">
          <p className="panel-kicker">Responsables</p>
          <h2>{managers.length}</h2>
          <p>{managers.join(", ")}</p>
        </article>
      </div>

      <article className="module-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="panel-kicker">Semaines</p>
            <h2>Navigation planning TG</h2>
          </div>
        </div>
        <div className="week-chip-row">
          {tgWeeks.map((week, index) => (
            <div
              key={week.id}
              className={`week-chip${index === 0 ? " week-chip-active" : ""}`}
            >
              {week.label}
            </div>
          ))}
        </div>
      </article>

      <div className="tg-grid">
        {groupedRayons.map(({ rayon, entries }) => {
          const family = entries[0]?.family ?? "Sale";
          return (
            <article key={rayon} className="tg-card">
              <div className="tg-card-head">
                <div>
                  <p className="panel-kicker">{family === "Sale" ? "Sale" : "Sucre"}</p>
                  <h2>{rayon}</h2>
                </div>
                <div className="tg-badges">
                  <span className="mini-badge mini-badge-tg">
                    {entries.filter((entry) => entry.type === "TG").length} TG
                  </span>
                  <span className="mini-badge mini-badge-gb">
                    {entries.filter((entry) => entry.type === "GB").length} GB
                  </span>
                </div>
              </div>

              <div className="tg-entry-list">
                {entries.map((entry, index) => (
                  <div key={`${entry.product}-${index}`} className="tg-entry-row">
                    <div className="tg-entry-top">
                      <span
                        className={`mini-badge ${entry.type === "TG" ? "mini-badge-tg-solid" : "mini-badge-gb-solid"}`}
                      >
                        {entry.type}
                      </span>
                      <strong>{entry.product}</strong>
                    </div>
                    <div className="tg-entry-meta">
                      <span>Resp. {entry.manager}</span>
                      {entry.quantity ? <span>Qte {entry.quantity}</span> : null}
                      {entry.mechanic ? <span>{entry.mechanic}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
