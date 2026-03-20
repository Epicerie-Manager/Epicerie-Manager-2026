type ModulePageProps = {
  title: string;
  kicker: string;
  description: string;
  cards: Array<{
    title: string;
    text: string;
    items?: string[];
  }>;
};

export function ModulePage({
  title,
  kicker,
  description,
  cards,
}: ModulePageProps) {
  return (
    <section className="module-layout">
      <header className="module-hero">
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <div className="module-grid">
        {cards.map((card) => (
          <article key={card.title} className="module-card">
            <h2>{card.title}</h2>
            <p>{card.text}</p>
            {card.items ? (
              <ul>
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
