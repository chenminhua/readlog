import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { SearchResult } from "../types";
import { Icon } from "./Icon";

type SearchBarProps = {
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: boolean;
  onQueryChange: (query: string) => void;
  onSelectResult: (id: string) => void;
};

function highlight(text: string, query: string) {
  const terms = query.trim().split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!terms.length) return text;
  const matcher = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(matcher).map((part, index) => index % 2 === 1 ? <mark key={index}>{part}</mark> : part);
}

export function SearchBar({ query, results, loading, error, onQueryChange, onSelectResult }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const expanded = focused && Boolean(query.trim());
  const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K";

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target)) setFocused(false);
    };
    window.addEventListener("keydown", handleGlobalShortcut);
    document.addEventListener("pointerdown", dismiss);
    return () => { window.removeEventListener("keydown", handleGlobalShortcut); document.removeEventListener("pointerdown", dismiss); };
  }, []);

  useEffect(() => { setActiveIndex(0); }, [query, results]);
  useEffect(() => {
    if (expanded) document.getElementById(`search-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, expanded]);

  const selectResultAt = (index: number) => {
    if (!results[index]) return;
    onSelectResult(results[index].id);
    setFocused(false);
    inputRef.current?.blur();
  };
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (query) onQueryChange("");
      else { setFocused(false); inputRef.current?.blur(); }
      return;
    }
    if (!query.trim() || !results.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setFocused(true);
      setActiveIndex((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
    } else if (event.key === "Enter" && expanded) {
      event.preventDefault();
      selectResultAt(activeIndex);
    }
  };

  return (
    <div className="search-panel" ref={panelRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className={`search-input ${expanded ? "is-open" : ""}`}>
        <Icon name="search" size={19} />
        <label className="sr-only" htmlFor="book-search">搜索书名、作者、笔记</label>
        <input id="book-search" role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? "search-results" : undefined} aria-activedescendant={expanded && results[activeIndex] ? `search-option-${activeIndex}` : undefined}
          autoComplete="off" onChange={(event) => { onQueryChange(event.target.value); setFocused(true); }} onFocus={() => setFocused(true)} onKeyDown={handleInputKeyDown}
          placeholder="搜索书名、作者、笔记…" ref={inputRef} type="search" value={query} />
        {query ? <button className="search-clear" type="button" aria-label="清空搜索" onClick={() => { onQueryChange(""); inputRef.current?.focus(); }}><Icon name="close" size={17} /></button> : <kbd>{shortcut}</kbd>}
      </div>
      {expanded && (
        <div className="search-dropdown">
          <div className="search-summary" role="status">{loading ? "正在搜索…" : error ? "搜索暂时不可用，请稍后重新输入。" : results.length ? `${results.length} 条匹配结果` : "没有找到匹配内容，试试其他关键词。"}</div>
          <div className="search-results" id="search-results" role="listbox" aria-label="搜索结果" aria-busy={loading}>
            {results.map((result, index) => (
              <div className={`search-result ${index === activeIndex ? "is-active" : ""}`} role="option" aria-selected={index === activeIndex} id={`search-option-${index}`} key={result.id}
                onMouseDown={(event) => event.preventDefault()} onClick={() => selectResultAt(index)} onMouseEnter={() => setActiveIndex(index)}>
                <div className="search-result__title">{highlight(result.title, query)}</div>
                <div className="search-result__meta">{highlight(result.author, query)}</div>
                <p>{highlight(result.excerpt, query)}</p>
              </div>
            ))}
          </div>
          {results.length > 0 && <div className="search-hint"><span>↑ ↓ 选择</span><span>↵ 打开</span><span>esc 清空</span></div>}
        </div>
      )}
    </div>
  );
}
