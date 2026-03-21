import MiniSearch from "minisearch";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookCard } from "./components/BookCard";
import { BookDetail } from "./components/BookDetail";
import { SearchBar } from "./components/SearchBar";
import { Sidebar } from "./components/Sidebar";
import type { BookDetail as BookDetailType, BookListItem, SearchEntry, SearchResult, ShelfStat } from "./types";

type SortMode = "addedAt" | "rating";

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

export default function App() {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [shelves, setShelves] = useState<ShelfStat[]>([]);
  const [activeShelf, setActiveShelf] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("addedAt");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookDetailType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchIndexRef = useRef<MiniSearch<SearchEntry> | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("./data/books.json").then((response) => response.json() as Promise<BookListItem[]>),
      fetch("./data/shelves.json").then((response) => response.json() as Promise<ShelfStat[]>)
    ]).then(([bookData, shelfData]) => {
      setBooks(bookData);
      setShelves(shelfData);
    });
  }, []);

  useEffect(() => {
    if (!selectedBookId) {
      setSelectedBook(null);
      return;
    }

    setDetailLoading(true);
    void fetch(`./data/books/${selectedBookId}.json`)
      .then((response) => response.json() as Promise<BookDetailType>)
      .then((detail) => setSelectedBook(detail))
      .finally(() => setDetailLoading(false));
  }, [selectedBookId]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const loadAndSearch = async () => {
      if (!searchIndexRef.current) {
        const entries = await fetch("./data/search-index.json").then(
          (response) => response.json() as Promise<SearchEntry[]>
        );

        searchIndexRef.current = new MiniSearch<SearchEntry>({
          fields: ["title", "author", "content", "tokens"],
          storeFields: ["id", "title", "author", "excerpt", "content", "tokens"],
          searchOptions: {
            prefix: true,
            fuzzy: 0.2
          }
        });
        searchIndexRef.current.addAll(entries);
      }

      const results = searchIndexRef.current.search(query, {
        prefix: true,
        fuzzy: 0.2
      }) as Array<SearchEntry & { score: number }>;

      setSearchResults(
        results.slice(0, 10).map((result) => ({
          ...result,
          excerpt: buildMatchedExcerpt(result.content, query)
        }))
      );
    };

    void loadAndSearch();
  }, [query]);

  const visibleBooks = useMemo(() => {
    const filteredBooks =
      activeShelf === "all" ? books : books.filter((book) => book.shelves.includes(activeShelf));

    return [...filteredBooks].sort((left, right) => compareBooks(left, right, sortMode));
  }, [activeShelf, books, sortMode]);

  const activeShelfLabel = activeShelf === "all" ? "所有图书" : activeShelf;

  return (
    <div className="layout">
      <Sidebar
        activeShelf={activeShelf}
        onSelectShelf={(shelf) => {
          setActiveShelf(shelf);
          setSelectedBookId(null);
        }}
        shelves={shelves}
        totalCount={books.length}
      />

      <main className="main-panel">
        <div className="topbar">
          <SearchBar
            onQueryChange={setQuery}
            onSelectResult={(id) => {
              setSelectedBookId(id);
              setQuery("");
              const matchedBook = books.find((book) => book.id === id);

              if (matchedBook && matchedBook.shelves.length > 0) {
                setActiveShelf(matchedBook.shelves[0]);
              }
            }}
            query={query}
            results={searchResults}
          />

          <div className="toolbar">
            <div>
              <p className="eyebrow">Current Shelf</p>
              <h2>{activeShelfLabel}</h2>
            </div>

            <label className="sort-select">
              <span>排序</span>
              <select onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}>
                <option value="addedAt">按加入时间</option>
                <option value="rating">按评分</option>
              </select>
            </label>
          </div>
        </div>

        <div className="content-grid">
          <section className="books-panel">
            {visibleBooks.map((book) => (
              <BookCard
                book={book}
                isActive={book.id === selectedBookId}
                key={book.id}
                onSelect={setSelectedBookId}
              />
            ))}
          </section>

          <BookDetail book={selectedBook} loading={detailLoading} />
        </div>
      </main>
    </div>
  );
}
