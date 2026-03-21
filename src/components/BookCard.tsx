import type { BookListItem } from "../types";

type BookCardProps = {
  book: BookListItem;
  isActive: boolean;
  onSelect: (id: string) => void;
};

function formatDate(input: string) {
  if (!input) {
    return "未知时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(input));
}

export function BookCard({ book, isActive, onSelect }: BookCardProps) {
  const coverSrc = book.cover.startsWith("/") ? `.${book.cover}` : book.cover;

  return (
    <button
      className={`book-card ${isActive ? "is-active" : ""}`}
      onClick={() => onSelect(book.id)}
      type="button"
    >
      <img alt={`${book.title} cover`} src={coverSrc} />
      <div className="book-card__body">
        <div className="book-card__header">
          <h3>{book.title}</h3>
          <span>{book.rating > 0 ? book.rating.toFixed(1) : "NR"}</span>
        </div>
        <p>{book.author}</p>
        <div className="book-card__footer">
          <span>{formatDate(book.addedAt)}</span>
          <span>{book.shelves.join(" / ")}</span>
        </div>
      </div>
    </button>
  );
}
