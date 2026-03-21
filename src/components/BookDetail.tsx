import ReactMarkdown from "react-markdown";
import type { BookDetail as BookDetailType } from "../types";

type BookDetailProps = {
  book: BookDetailType | null;
  loading: boolean;
};

export function BookDetail({ book, loading }: BookDetailProps) {
  if (loading) {
    return <section className="detail-panel detail-panel--placeholder">正在加载详情…</section>;
  }

  if (!book) {
    return (
      <section className="detail-panel detail-panel--placeholder">
        <h2>选择一本书</h2>
        <p>右侧列表默认展示当前书架内的书，点击卡片后按需加载详情。</p>
      </section>
    );
  }

  const coverSrc = book.cover.startsWith("/") ? `.${book.cover}` : book.cover;

  return (
    <section className="detail-panel">
      <div className="detail-panel__hero">
        <img alt={`${book.title} cover`} src={coverSrc} />
        <div>
          <p className="eyebrow">Book Detail</p>
          <h2>{book.title}</h2>
          <dl className="detail-meta">
            <div>
              <dt>作者</dt>
              <dd>{book.author}</dd>
            </div>
            <div>
              <dt>出版社</dt>
              <dd>{book.publisher || "未知"}</dd>
            </div>
            <div>
              <dt>出版时间</dt>
              <dd>{book.publishedAt || "未知"}</dd>
            </div>
            <div>
              <dt>评分</dt>
              <dd>{book.rating > 0 ? book.rating.toFixed(1) : "未评分"}</dd>
            </div>
            <div>
              <dt>书架</dt>
              <dd>{book.shelves.join(" / ") || "未分类"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="detail-notes">
        <h3>笔记</h3>
        <div className="markdown-body">
          <ReactMarkdown>{book.notes}</ReactMarkdown>
        </div>
      </div>
    </section>
  );
}
