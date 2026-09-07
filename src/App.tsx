import type MiniSearch from "minisearch";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { BookCard } from "./components/BookCard";
import { SearchBar } from "./components/SearchBar";
import { Icon } from "./components/Icon";
import { DetailErrorBoundary } from "./components/DetailErrorBoundary";
import { Sidebar } from "./components/Sidebar";
import type { BookDetail as BookDetailType, BookListItem, SearchEntry, SearchResult, ShelfStat } from "./types";

type SortMode = "addedAt" | "rating";
const BookDetail = lazy(() => import("./components/BookDetail").then((module) => ({ default: module.BookDetail })));

function compareBooks(left: BookListItem, right: BookListItem, sortMode: SortMode) {
  if (sortMode === "rating") {
    return right.rating - left.rating || left.title.localeCompare(right.title, "zh-Hans-CN");
  }

  return new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime();
}

function splitSearchTerms(query: string) {
  const lowered = query.trim().toLowerCase();
  const englishTerms = lowered.match(/[a-z0-9]+/g) ?? [];
  const chineseTerms = lowered.match(/[\u4e00-\u9fff]+/g) ?? [];
  const rawTerms = [...englishTerms, ...chineseTerms, lowered].filter(Boolean);

  return Array.from(new Set(rawTerms)).sort((left, right) => right.length - left.length);
}

function buildMatchedExcerpt(content: string, query: string) {
  const normalizedContent = content.replace(/\s+/g, " ").trim();

  if (!normalizedContent) {
    return "";
  }

  const searchTerms = splitSearchTerms(query);
  const loweredContent = normalizedContent.toLowerCase();
  const matchedIndex = searchTerms.reduce<number>((currentMinIndex, term) => {
    const nextIndex = loweredContent.indexOf(term.toLowerCase());

    if (nextIndex === -1) {
      return currentMinIndex;
    }

    return currentMinIndex === -1 ? nextIndex : Math.min(currentMinIndex, nextIndex);
  }, -1);

  if (matchedIndex === -1) {
    return normalizedContent.slice(0, 180);
  }

  const snippetRadius = 70;
  const snippetStart = Math.max(0, matchedIndex - snippetRadius);
  const snippetEnd = Math.min(normalizedContent.length, matchedIndex + 110);
  const prefix = snippetStart > 0 ? "…" : "";
  const suffix = snippetEnd < normalizedContent.length ? "…" : "";

  return `${prefix}${normalizedContent.slice(snippetStart, snippetEnd).trim()}${suffix}`;
}

function bookIdFromLocation() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get("book");
}

async function fetchData<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json() as Promise<T>;
}

export default function App() {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [shelves, setShelves] = useState<ShelfStat[]>([]);
  const [activeShelf, setActiveShelf] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("addedAt");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(bookIdFromLocation);
  const [selectedBook, setSelectedBook] = useState<BookDetailType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const searchIndexRef = useRef<Promise<MiniSearch<SearchEntry>> | null>(null);
  const scrollPosition = useRef(0);
  const lastBookId = useRef<string | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setBooksLoading(true);
    setBooksError(false);
    void Promise.all([
      fetchData<BookListItem[]>("./data/books.json", controller.signal),
      fetchData<ShelfStat[]>("./data/shelves.json", controller.signal)
    ]).then(([bookData, shelfData]) => {
      setBooks(bookData);
      setShelves(shelfData);
    }).catch(() => { if (!controller.signal.aborted) setBooksError(true); })
      .finally(() => { if (!controller.signal.aborted) setBooksLoading(false); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    const handleHashChange = () => setSelectedBookId(bookIdFromLocation());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (selectedBookId) {
        window.scrollTo(0, 0);
        backRef.current?.focus({ preventScroll: true });
      } else {
        window.scrollTo(0, scrollPosition.current);
        const card = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-book-id]")).find((item) => item.dataset.bookId === lastBookId.current);
        card?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedBookId]);

  useEffect(() => {
    setSelectedBook(null);
    setDetailError(false);
    if (!selectedBookId) return;
    const controller = new AbortController();
    setDetailLoading(true);
    void fetchData<BookDetailType>(`./data/books/${encodeURIComponent(selectedBookId)}.json`, controller.signal)
      .then(setSelectedBook)
      .catch(() => { if (!controller.signal.aborted) setDetailError(true); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedBookId, retry]);

  useEffect(() => {
    setSearchResults([]);
    setSearchError(false);
    if (!query.trim()) { setSearchLoading(false); return; }
    let cancelled = false;
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      const loadAndSearch = async () => {
        try {
          if (!searchIndexRef.current) {
            searchIndexRef.current = Promise.all([fetchData<SearchEntry[]>("./data/search-index.json"), import("minisearch")]).then(([entries, { default: MiniSearch }]) => {
              const index = new MiniSearch<SearchEntry>({
                fields: ["title", "author", "content", "tokens"],
                storeFields: ["id", "title", "author", "excerpt", "content", "tokens"]
              });
              index.addAll(entries);
              return index;
            }).catch((error: unknown) => { searchIndexRef.current = null; throw error; });
          }
          const index = await searchIndexRef.current;
          if (cancelled) return;
          const results = index.search(query, { prefix: true, fuzzy: 0.2 });
          setSearchResults(results.slice(0, 10).map((result) => ({
            id: String(result.id), title: String(result.title), author: String(result.author),
            content: String(result.content), tokens: result.tokens as string[], score: result.score,
            excerpt: buildMatchedExcerpt(String(result.content), query)
          })));
        } catch { if (!cancelled) setSearchError(true); }
        finally { if (!cancelled) setSearchLoading(false); }
      };
      void loadAndSearch();
    }, 160);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query]);

  const visibleBooks = useMemo(() => {
    const filteredBooks = activeShelf === "all" ? books : books.filter((book) => book.shelves.includes(activeShelf));
    return [...filteredBooks].sort((left, right) => compareBooks(left, right, sortMode));
  }, [activeShelf, books, sortMode]);

  const openBook = (id: string) => {
    if (!selectedBookId) scrollPosition.current = window.scrollY;
    lastBookId.current = id;
    const hash = `#book=${encodeURIComponent(id)}`;
    if (selectedBookId) window.history.replaceState(window.history.state, "", hash);
    else window.history.pushState({ readlogDetail: true }, "", hash);
    setSelectedBookId(id);
    setQuery("");
  };
  const returnToShelf = () => {
    if (window.history.state?.readlogDetail) window.history.back();
    else {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setSelectedBookId(null);
    }
  };
  const activeShelfLabel = activeShelf === "all" ? "所有图书" : activeShelf;

  return (
    <div className="layout">
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        const main = document.getElementById("main-content");
        main?.focus();
        main?.scrollIntoView({ block: "start" });
      }}>跳至内容</a>
      <Sidebar activeShelf={activeShelf} onSelectShelf={(shelf) => {
        setActiveShelf(shelf);
        scrollPosition.current = 0;
        lastBookId.current = null;
        setSelectedBookId(null);
        setQuery("");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        window.scrollTo(0, 0);
      }} shelves={shelves} totalCount={books.length} />
      <main className="main-panel" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <SearchBar onQueryChange={setQuery} onSelectResult={openBook} query={query} results={searchResults} loading={searchLoading} error={searchError} />
        </header>
        <div className="main-content">
          {selectedBookId ? (
            <div className="detail-wrapper">
              <button className="detail-back" onClick={returnToShelf} ref={backRef} type="button"><Icon name="arrow-left" size={18} />返回{activeShelfLabel}</button>
              {detailError ? <div className="status-panel" role="alert"><p>这本书暂时无法打开。</p><button className="text-button" onClick={() => setRetry((value) => value + 1)}>重新加载</button></div> : <DetailErrorBoundary><Suspense fallback={<p role="status">正在打开这本书…</p>}><BookDetail book={selectedBook} loading={detailLoading} /></Suspense></DetailErrorBoundary>}
            </div>
          ) : (
            <>
              <div className="toolbar">
                <div className="shelf-heading"><h1>{activeShelfLabel}</h1><span>{visibleBooks.length} 本</span></div>
                <label className="sort-select"><Icon name="sort" size={17} /><span className="sr-only">排序方式</span><select onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}><option value="addedAt">最近加入</option><option value="rating">评分最高</option></select></label>
              </div>
              {booksLoading ? <div className="books-panel" aria-label="正在加载书架" aria-busy="true">{Array.from({ length: 8 }, (_, index) => <div className="book-skeleton" key={index}><div className="skeleton skeleton-cover" /><div className="skeleton skeleton-line" /></div>)}</div>
                : booksError ? <div className="status-panel" role="alert"><p>书架暂时无法加载，请稍后重试。</p><button className="text-button" onClick={() => setRetry((value) => value + 1)}>重新加载</button></div>
                : visibleBooks.length ? <section className="books-panel" aria-label={activeShelfLabel}>{visibleBooks.map((book) => <BookCard book={book} key={book.id} onSelect={openBook} />)}</section>
                : <div className="status-panel"><Icon name="book" size={30} /><p>这个书架还没有图书。</p></div>}
              {!booksLoading && visibleBooks.length > 0 && <footer className="collection-footer">共 {visibleBooks.length} 本 · 每次阅读，都有所得</footer>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
