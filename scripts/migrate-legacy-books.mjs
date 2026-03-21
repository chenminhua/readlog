import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "books");
const targetDir = path.join(rootDir, "content", "books");

const slugMap = {
  "2026_12_rules.md": "12-rules-for-life",
  "2026_facebook_little_red_book.md": "facebook-and-little-red-book",
  "2026_inner_game_of_tennis.md": "the-inner-game-of-tennis",
  "2026_outlive.md": "outlive",
  "2026_the_art_of_spending_money.md": "the-art-of-spending-money",
  "2026_一本书看懂地缘政治.md": "a-book-on-geopolitics",
  "2026_比较政治学.md": "comparative-politics",
  "2026_斯多葛主义.md": "stoicism",
  "2026_空腹的奇妙自愈力.md": "the-healing-power-of-fasting",
  "2026_美国困局.md": "american-gridlock",
  "2026_置身事内.md": "inside-china-government",
  "2026_鱼不存在.md": "why-fish-dont-exist"
};

const metadataMap = {
  "12-rules-for-life": {
    author: "Jordan B. Peterson",
    publisher: "Random House Canada",
    publishedAt: "2018-01-16",
    shelves: ["Psychology", "Self-help"]
  },
  "facebook-and-little-red-book": {
    author: "未知",
    publisher: "未知",
    publishedAt: "",
    shelves: ["Business", "Technology"]
  },
  "the-inner-game-of-tennis": {
    author: "W. Timothy Gallwey",
    publisher: "Random House",
    publishedAt: "1974-01-01",
    shelves: ["Psychology", "Sports"]
  },
  outlive: {
    author: "Peter Attia",
    publisher: "Harmony",
    publishedAt: "2023-03-28",
    shelves: ["Health", "Science"]
  },
  "the-art-of-spending-money": {
    author: "Morgan Housel",
    publisher: "未知",
    publishedAt: "",
    shelves: ["Finance", "Behavior"]
  },
  "a-book-on-geopolitics": {
    author: "未知",
    publisher: "未知",
    publishedAt: "",
    shelves: ["Politics", "History"]
  },
  "comparative-politics": {
    author: "未知",
    publisher: "未知",
    publishedAt: "",
    shelves: ["Politics", "Social Science"]
  },
  stoicism: {
    author: "未知",
    publisher: "未知",
    publishedAt: "",
    shelves: ["Philosophy", "Psychology"]
  },
  "the-healing-power-of-fasting": {
    author: "未知",
    publisher: "未知",
    publishedAt: "",
    shelves: ["Health", "Lifestyle"]
  },
  "american-gridlock": {
    author: "未知",
    publisher: "未知",
    publishedAt: "",
    shelves: ["Politics", "America"]
  },
  "inside-china-government": {
    author: "兰小欢",
    publisher: "上海人民出版社",
    publishedAt: "2021-08-01",
    shelves: ["Economics", "China"]
  },
  "why-fish-dont-exist": {
    author: "Lulu Miller",
    publisher: "Simon & Schuster",
    publishedAt: "2020-04-14",
    shelves: ["Science", "Memoir"]
  }
};

function parseLegacyMarkdown(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return {
      frontmatter: {},
      body: raw.trim()
    };
  }

  const [, frontmatterBlock, body] = match;
  const frontmatter = {};

  for (const line of frontmatterBlock.split("\n")) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");
    frontmatter[key] = value;
  }

  return {
    frontmatter,
    body: body.trim()
  };
}

function escapeYamlString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function main() {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir);

  for (const entry of entries) {
    if (!entry.endsWith(".md")) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry);
    const raw = await readFile(sourcePath, "utf8");
    const { frontmatter, body } = parseLegacyMarkdown(raw);
    const slug = slugMap[entry] ?? entry.replace(/\.md$/, "").replace(/_/g, "-");
    const metadata = metadataMap[slug] ?? {
      author: "未知",
      publisher: "未知",
      publishedAt: "",
      shelves: ["Uncategorized"]
    };
    const title = frontmatter.title ?? slug;
    const addedAt = frontmatter.date ?? new Date().toISOString();
    const targetPath = path.join(targetDir, `${slug}.md`);

    const fileContent = [
      "---",
      `id: ${slug}`,
      `title: ${escapeYamlString(title)}`,
      `author: ${escapeYamlString(metadata.author)}`,
      `publisher: ${escapeYamlString(metadata.publisher)}`,
      `publishedAt: ${metadata.publishedAt || ""}`,
      "rating: 0",
      `addedAt: ${addedAt}`,
      "shelves:",
      ...metadata.shelves.map((shelf) => `  - ${escapeYamlString(shelf)}`),
      "cover: /static/covers/placeholder.svg",
      "---",
      "",
      "# Notes",
      "",
      body
    ].join("\n");

    await writeFile(targetPath, `${fileContent.trim()}\n`, "utf8");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
