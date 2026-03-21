import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setActiveIndex(-1);
      return;
    }

    if (results.length === 0) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex((current) => {
      if (current < 0) {
        return 0;
      }

      return Math.min(current, results.length - 1);
    });
  }, [query, results]);

  const selectResultAt = (index: number) => {
    const result = results[index];

    if (!result) {
      return;
    }

    onSelectResult(result.id);
    setActiveIndex(-1);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!query.trim() || results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const targetIndex = activeIndex >= 0 ? activeIndex : 0;
      selectResultAt(targetIndex);
    }
  };

  return (
    <div className="search-panel">
      <label className="search-input">
        <span className="sr-only">搜索书名、作者、笔记</span>
        <input
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="搜索标题、作者、笔记"
          ref={inputRef}
          type="search"
          value={query}
        />
      </label>

      {query.trim() ? (
        <div className="search-results">
          {results.length > 0 ? (
            results.map((result, index) => (
              <button
                className={`search-result${index === activeIndex ? " is-active" : ""}`}
                key={result.id}
                onClick={() => selectResultAt(index)}
                onMouseEnter={() => setActiveIndex(index)}
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
