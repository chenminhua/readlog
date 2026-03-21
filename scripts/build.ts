import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

type BookFrontmatter = {
  id?: string;
  title: string;
  author: string;
  publisher: string;
  publishedAt: string;
  rating: number;
  addedAt: string;
  shelves: string[];
  cover: string;
  summary?: string;
  keywords?: string[];
};

type BookListItem = {
  id: string;
  title: string;
  author: string;
  rating: number;
  addedAt: string;
  shelves: string[];
  cover: string;
};

type BookDetail = BookListItem & {
  publisher: string;
  publishedAt: string;
  notes: string;
  summary?: string;
  keywords?: string[];
};

type SearchEntry = {
  id: string;
  title: string;
  author: string;
  content: string;
  excerpt: string;
  tokens: string[];
};

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content", "books");
const publicDir = path.join(rootDir, "public", "data");
const publicBooksDir = path.join(publicDir, "books");

function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    throw new Error("Invalid markdown: missing frontmatter block");
  }

  const [, frontmatterBlock, body] = match;
  const lines = frontmatterBlock.split("\n");
  const data: Record<string, unknown> = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.startsWith("  - ")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (rawValue.length === 0) {
      const arrayValues: string[] = [];
      let nextIndex = index + 1;

      while (nextIndex < lines.length && lines[nextIndex].startsWith("  - ")) {
        arrayValues.push(lines[nextIndex].replace("  - ", "").trim().replace(/^"|"$/g, ""));
        nextIndex += 1;
      }

      data[key] = arrayValues;
      index = nextIndex - 1;
      continue;
    }

    if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
      data[key] = Number(rawValue);
      continue;
    }

    data[key] = rawValue.replace(/^"|"$/g, "");
  }

  return { data, body: body.trim() };
}

function normalizeNotes(markdown: string) {
  return markdown
    .replace(/^#\s+Notes\s*/i, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/[#*_~-]/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function preserveMarkdownNotes(markdown: string) {
  return markdown.replace(/^#\s+Notes\s*/i, "").trim();
}

function toBookFrontmatter(data: Record<string, unknown>): BookFrontmatter {
  return {
    id: data.id ? String(data.id) : undefined,
    title: String(data.title ?? ""),
    author: String(data.author ?? "未知"),
    publisher: String(data.publisher ?? "未知"),
    publishedAt: String(data.publishedAt ?? ""),
    rating: Number(data.rating ?? 0),
    addedAt: String(data.addedAt ?? ""),
    shelves: Array.isArray(data.shelves) ? data.shelves.map((item) => String(item)) : [],
    cover: String(data.cover ?? "/static/covers/placeholder.svg"),
    summary: data.summary ? String(data.summary) : undefined,
    keywords: Array.isArray(data.keywords) ? data.keywords.map((item) => String(item)) : undefined
  };
}

function buildChineseSearchTokens(input: string) {
  const segments = input.match(/[\u4e00-\u9fff]+/g) ?? [];
  const tokens = new Set<string>();

  for (const segment of segments) {
    if (segment.length < 2) {
      continue;
    }

    tokens.add(segment);

    for (let size = 2; size <= Math.min(4, segment.length); size += 1) {
      for (let start = 0; start <= segment.length - size; start += 1) {
        tokens.add(segment.slice(start, start + size));
      }
    }
  }

  return [...tokens];
}

function buildSearchTokens(input: string) {
  const normalized = input.toLowerCase();
  const englishTokens = normalized.match(/[a-z0-9]+/g) ?? [];
  const chineseTokens = buildChineseSearchTokens(normalized);
  return Array.from(new Set([...englishTokens, ...chineseTokens])).slice(0, 400);
}

function deriveIdFromFilename(filename: string) {
  return path.basename(filename, path.extname(filename));
}

async function main() {
  await mkdir(publicBooksDir, { recursive: true });
  await rm(publicBooksDir, { recursive: true, force: true });
  await mkdir(publicBooksDir, { recursive: true });

  const entries = await readdir(contentDir);
  const books: BookListItem[] = [];
  const shelvesCount = new Map<string, number>();
  const searchEntries: SearchEntry[] = [];
  const seenIds = new Set<string>();

  for (const entry of entries) {
    if (!entry.endsWith(".md")) {
      continue;
    }

    const filePath = path.join(contentDir, entry);
    const raw = await readFile(filePath, "utf8");
    const { data, body } = parseFrontmatter(raw);
    const frontmatter = toBookFrontmatter(data);
    const bookId = frontmatter.id?.trim() || deriveIdFromFilename(entry);

    if (seenIds.has(bookId)) {
      throw new Error(`Duplicate book id "${bookId}" generated from ${entry}`);
    }

    seenIds.add(bookId);
    const notes = preserveMarkdownNotes(body);
    const searchableNotes = normalizeNotes(body);

    const listItem: BookListItem = {
      id: bookId,
      title: frontmatter.title,
      author: frontmatter.author,
      rating: frontmatter.rating,
      addedAt: frontmatter.addedAt,
      shelves: frontmatter.shelves,
      cover: frontmatter.cover
    };

    const detail: BookDetail = {
      ...listItem,
      publisher: frontmatter.publisher,
      publishedAt: frontmatter.publishedAt,
      notes,
      summary: frontmatter.summary,
      keywords: frontmatter.keywords
    };

    books.push(listItem);

    for (const shelf of frontmatter.shelves) {
      shelvesCount.set(shelf, (shelvesCount.get(shelf) ?? 0) + 1);
    }

    const excerpt = searchableNotes.slice(0, 220);
    const searchableSource = [
      frontmatter.title,
      frontmatter.author,
      frontmatter.summary,
      searchableNotes.slice(0, 2400)
    ]
      .filter(Boolean)
      .join(" ");

    searchEntries.push({
      id: bookId,
      title: frontmatter.title,
      author: frontmatter.author,
      content: searchableSource,
      excerpt,
      tokens: buildSearchTokens([searchableSource, ...(frontmatter.keywords ?? [])].join(" "))
    });

    await writeFile(
      path.join(publicBooksDir, `${bookId}.json`),
      `${JSON.stringify(detail, null, 2)}\n`,
      "utf8"
    );
  }

  books.sort((left, right) => new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime());

  const shelves = Array.from(shelvesCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "zh-Hans-CN"));

  await writeFile(path.join(publicDir, "books.json"), `${JSON.stringify(books, null, 2)}\n`, "utf8");
  await writeFile(path.join(publicDir, "shelves.json"), `${JSON.stringify(shelves, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(publicDir, "search-index.json"),
    `${JSON.stringify(searchEntries, null, 2)}\n`,
    "utf8"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
