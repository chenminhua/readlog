import type { BookListItem } from "../types";
import { Icon } from "./Icon";

type BookCardProps = {
  book: BookListItem;
  onSelect: (id: string) => void;
};

export function BookCard({ book, onSelect }: BookCardProps) {
  const coverSrc = book.cover.startsWith("/") ? `.${book.cover}` : book.cover;
  return (
    <button className="book-card" data-book-id={book.id} onClick={() => onSelect(book.id)} type="button" aria-label={`查看《${book.title}》，${book.author}`}>
      <span className="book-card__cover">
        <img alt="" src={coverSrc} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "./static/covers/placeholder.svg"; }} />
        <span className="book-card__open"><Icon name="arrow-right" size={18} /></span>
      </span>
      <span className="book-card__body">
        <span className="book-card__title">{book.title}</span>
        <span className="book-card__author">{book.author}</span>
        <span className="book-card__footer">
          <span className={`rating ${book.rating > 0 ? "" : "rating--empty"}`}><Icon name="star" size={13} />{book.rating > 0 ? book.rating.toFixed(1) : "未评分"}</span>
          <span className="book-card__shelf">{book.shelves[0] || "未分类"}</span>
        </span>
      </span>
    </button>
  );
}
