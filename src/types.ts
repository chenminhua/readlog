export type BookListItem = {
  id: string;
  title: string;
  author: string;
  rating: number;
  addedAt: string;
  shelves: string[];
  cover: string;
};

export type BookDetail = BookListItem & {
  publisher: string;
  publishedAt: string;
  notes: string;
  summary?: string;
  keywords?: string[];
};

export type ShelfStat = {
  name: string;
  count: number;
};

export type SearchEntry = {
  id: string;
  title: string;
  author: string;
  content: string;
  excerpt: string;
  tokens: string[];
};

export type SearchResult = SearchEntry & {
  score: number;
};
