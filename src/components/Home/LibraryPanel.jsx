import "./HomePanels.css";

export function LibraryPanel() {
  return (
    <section className="home-panel" aria-label="Library">
      <header className="home-panel__header">
        <h2 className="home-panel__title">Library</h2>
        <p className="home-panel__subtitle">Track every score you convert.</p>
      </header>
      <div className="home-panel__body">
        <p className="home-panel__placeholder">Your library is empty. Convert a score first to populate this space.</p>
      </div>
    </section>
  );
}
