import type { ShelfStat } from "../types";

type SidebarProps = {
  shelves: ShelfStat[];
  activeShelf: string;
  totalCount: number;
  onSelectShelf: (shelf: string) => void;
};

export function Sidebar({ shelves, activeShelf, totalCount, onSelectShelf }: SidebarProps) {
  return (
    <aside className="sidebar">
      <p className="eyebrow sidebar__brand">ReadLog</p>

      <div className="shelf-list">
        <button
          className={`shelf-button ${activeShelf === "all" ? "is-active" : ""}`}
          onClick={() => onSelectShelf("all")}
          type="button"
        >
          <span>ALL</span>
          <strong>{totalCount}</strong>
        </button>

        {shelves.map((shelf) => (
          <button
            key={shelf.name}
            className={`shelf-button ${activeShelf === shelf.name ? "is-active" : ""}`}
            onClick={() => onSelectShelf(shelf.name)}
            type="button"
          >
            <span>{shelf.name}</span>
            <strong>{shelf.count}</strong>
          </button>
        ))}
      </div>
    </aside>
  );
}
