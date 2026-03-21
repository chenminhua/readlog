import type { SearchResult } from "../types";

type SearchBarProps = {
  query: string;
  results: SearchResult[];
  onQueryChange: (query: string) => void;
  onSelectResult: (id: string) => void;
};

function highlight(text: string, query: string) {
  if (!query.trim()) {
    return text;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(matcher);

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

export function SearchBar({ query, results, onQueryChange, onSelectResult }: SearchBarProps) {
  return (
    <div className="search-panel">
      <label className="search-input">
        <span className="sr-only">搜索书名、作者、笔记</span>
        <input
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索标题、作者、笔记"
          type="search"
          value={query}
        />
      </label>

      {query.trim() ? (
        <div className="search-results">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                className="search-result"
                key={result.id}
                onClick={() => onSelectResult(result.id)}
                type="button"
              >
                <div className="search-result__title">{highlight(result.title, query)}</div>
                <div className="search-result__meta">{highlight(result.author, query)}</div>
                <p>{highlight(result.excerpt, query)}</p>
              </button>
            ))
          ) : (
            <div className="search-empty">没有找到匹配内容。</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
