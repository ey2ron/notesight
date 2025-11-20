import { useMemo } from "react";
import "./HomePanels.css";

export function LibraryPanel({
  items = [],
  favorites = [],
  onFavorite,
  onUnfavorite,
  onRename,
  onDelete,
  onOpen,
  emptyMessage,
  openingItemId,
}) {
  const hasItems = items.length > 0;
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const fallbackMessage = emptyMessage ?? "Your library is empty. Convert a score first to populate this space.";

  const handleCardKeyDown = (event, item) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen?.(item);
    }
  };

  const preventPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <section className="home-panel" aria-label="Library">
      <header className="home-panel__header">
        <h2 className="home-panel__title">Library</h2>
        <p className="home-panel__subtitle">Track every score you convert.</p>
      </header>
      <div className={`home-panel__body ${hasItems ? "home-panel__body--library" : ""}`}>
        {hasItems ? (
          items.map((item) => (
            <article
              key={item.id}
              className={`library-card${onOpen ? " library-card--interactive" : ""}${
                openingItemId === item.id ? " library-card--opening" : ""
              }`}
              aria-label={`${item.title} file`}
              role={onOpen ? "button" : undefined}
              tabIndex={onOpen ? 0 : undefined}
              onClick={onOpen ? () => onOpen(item) : undefined}
              onKeyDown={onOpen ? (event) => handleCardKeyDown(event, item) : undefined}
              aria-busy={openingItemId === item.id}
            >
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
                {favoriteSet.has(item.id) && <span className="library-card__badge" aria-label="Favorited">★</span>}
              </div>
              <div className="library-card__footer">
                <div className="library-card__details">
                  <p className="library-card__title">{item.title}</p>
                  {item.lastOpened && <p className="library-card__meta">Opened {item.lastOpened}</p>}
                </div>
                <div className="library-card__menu" role="group" aria-label={`Options for ${item.title}`} onClick={preventPropagation}>
                  <button
                    type="button"
                    className="library-card__menu-button"
                    aria-haspopup="true"
                    aria-expanded="false"
                    onClick={preventPropagation}
                  >
                    ⋮
                  </button>
                  <ul className="library-card__menu-list" role="menu">
                    <li>
                      <button
                        type="button"
                        className="library-card__menu-item"
                        onClick={(event) => {
                          event.stopPropagation();
                          favoriteSet.has(item.id) ? onUnfavorite?.(item.id) : onFavorite?.(item.id);
                        }}
                      >
                        {favoriteSet.has(item.id) ? "Unfavorite" : "Favorite"}
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="library-card__menu-item"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRename?.(item.id);
                        }}
                      >
                        Rename
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="library-card__menu-item"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete?.(item.id);
                        }}
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
          <p className="home-panel__placeholder">{fallbackMessage}</p>
        )}
      </div>
      {hasItems && (
        <p className="home-panel__placeholder home-panel__placeholder--muted">
          Your recent conversions will appear here.
        </p>
      )}
    </section>
  );
}
