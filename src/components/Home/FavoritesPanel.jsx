import "./HomePanels.css";

export function FavoritesPanel({ items = [], onUnfavorite, onRename, onDelete }) {
  const hasFavorites = items.length > 0;

  return (
    <section className="home-panel" aria-label="Favorites">
      <header className="home-panel__header">
        <h2 className="home-panel__title">Favorites</h2>
        <p className="home-panel__subtitle">Your most-loved conversions live here.</p>
      </header>
      <div className={`home-panel__body ${hasFavorites ? "home-panel__body--library" : ""}`}>
        {hasFavorites ? (
          items.map((item) => (
            <article key={item.id} className="library-card library-card--favorite" aria-label={`${item.title} favorite`}>
              <div className="library-card__thumb" aria-hidden="true" style={{ backgroundColor: item.thumbColor }}>
                <span className="library-card__filetype">{item.type}</span>
                <div
                  className={`library-card__preview library-card__preview--${item.previewVariant ?? "generic"}`}
                >
                  {item.previewGlyph && (
                    <span className="library-card__preview-glyph" aria-hidden="true">
                      {item.previewGlyph}
                    </span>
                  )}
                  <span className="library-card__preview-label">{item.type}</span>
                </div>
                <span className="library-card__badge" aria-label="Favorited">★</span>
              </div>
              <div className="library-card__footer">
                <div className="library-card__details">
                  <p className="library-card__title">{item.title}</p>
                  {item.lastOpened && <p className="library-card__meta">Opened {item.lastOpened}</p>}
                </div>
                <div className="library-card__menu" role="group" aria-label={`Options for ${item.title}`}>
                  <button type="button" className="library-card__menu-button" aria-haspopup="true" aria-expanded="false">
                    ⋮
                  </button>
                  <ul className="library-card__menu-list" role="menu">
                    <li>
                      <button
                        type="button"
                        className="library-card__menu-item"
                        onClick={() => onUnfavorite?.(item.id)}
                      >
                        Unfavorite
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="library-card__menu-item"
                        onClick={() => onRename?.(item.id)}
                      >
                        Rename
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="library-card__menu-item"
                        onClick={() => onDelete?.(item.id)}
                      >
                        Delete
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="home-panel__placeholder">No favorites yet. Save a conversion to see it here.</p>
        )}
      </div>
    </section>
  );
}
