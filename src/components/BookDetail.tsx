import ReactMarkdown from "react-markdown";
import type { BookDetail as BookDetailType } from "../types";
import { Icon } from "./Icon";

type BookDetailProps = { book: BookDetailType | null; loading: boolean };

export function BookDetail({ book, loading }: BookDetailProps) {
  if (loading) return <div className="detail-loading" role="status"><div className="skeleton skeleton-cover" /><div><div className="skeleton skeleton-title" /><div className="skeleton skeleton-line" /><p>正在打开这本书…</p></div></div>;
  if (!book) return null;
  const coverSrc = book.cover.startsWith("/") ? `.${book.cover}` : book.cover;
  return (
    <article className="detail-panel">
      <div className="detail-panel__hero">
        <div className="detail-cover"><img alt={`${book.title}封面`} src={coverSrc} /></div>
        <div className="detail-heading">
          <p className="detail-shelves">{book.shelves.join(" / ") || "未分类"}</p>
          <h1>{book.title}</h1>
          <p className="detail-author">{book.author}</p>
          <p className="detail-rating"><Icon name="star" size={17} />{book.rating > 0 ? book.rating.toFixed(1) : "未评分"}<span>个人评分</span></p>
          <dl className="detail-meta">
            <div><dt>出版社</dt><dd>{book.publisher || "暂无信息"}</dd></div>
            <div><dt>出版时间</dt><dd>{book.publishedAt || "暂无信息"}</dd></div>
          </dl>
        </div>
      </div>
      <section className="detail-notes" aria-labelledby="notes-heading">
        <div className="notes-heading"><h2 id="notes-heading">阅读笔记</h2><span>NOTES</span></div>
        <div className="markdown-body">{book.notes.trim() ? <ReactMarkdown>{book.notes}</ReactMarkdown> : <p className="empty-notes">还没有留下笔记。</p>}</div>
      </section>
    </article>
  );
}
