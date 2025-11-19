import "./HomePanels.css";

export function FavoritesPanel() {
  return (
    <section className="home-panel" aria-label="Favorites">
      <header className="home-panel__header">
        <h2 className="home-panel__title">Favorites</h2>
        <p className="home-panel__subtitle">Your most-loved conversions live here.</p>
      </header>
      <div className="home-panel__body">
        <p className="home-panel__placeholder">No favorites yet. Save a conversion to see it here.</p>
      </div>
    </section>
  );
}
