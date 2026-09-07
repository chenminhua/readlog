import type { ShelfStat } from "../types";
import { Icon } from "./Icon";

type SidebarProps = {
  shelves: ShelfStat[];
  activeShelf: string;
  totalCount: number;
  onSelectShelf: (shelf: string) => void;
};

export function Sidebar({ shelves, activeShelf, totalCount, onSelectShelf }: SidebarProps) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#" onClick={(event) => { event.preventDefault(); onSelectShelf("all"); }} aria-label="ReadLog，所有图书">
        <Icon name="book" size={25} /><span>ReadLog<span className="brand-dot">.</span></span>
      </a>
      <p className="sidebar-label">我的书架</p>
      <nav className="shelf-list" aria-label="书架">
        {[{ name: "all", count: totalCount }, ...[...shelves].sort((a, b) => b.count - a.count)].map((shelf) => (
          <button
            key={shelf.name}
            className={`shelf-button ${activeShelf === shelf.name ? "is-active" : ""}`}
            aria-current={activeShelf === shelf.name ? "page" : undefined}
            onClick={(event) => {
              onSelectShelf(shelf.name);
              if (window.matchMedia("(max-width: 760px)").matches) event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
            }}
            type="button"
          >
            <span>{shelf.name === "all" ? "所有" : shelf.name}</span>
            <span className="shelf-count">{shelf.count}</span>
          </button>
        ))}
      </nav>
      <p className="sidebar-footer">读过的书，留下的想法。</p>
    </aside>
  );
}
