ReadLog — 技术设计文档（v1）

1. 项目目标

构建一个部署在 GitHub Pages 上的个人读书记录网站，具备：
	•	书架管理
	•	书籍详情展示
	•	本地全文搜索
	•	可扩展到“类语义搜索”

约束：
	•	纯前端静态站（无后端）
	•	数据完全存储在 repo 内

⸻

2. 核心设计原则
	1.	数据源与展示解耦
	•	源数据：Markdown / JSON 文件
	•	展示数据：构建生成 JSON
	2.	避免一次性加载
	•	列表 / 详情 / 搜索分离
	3.	可持续维护
	•	人类可读 + Git diff 友好

⸻

3. 功能需求

页面分为三个区域，

1. 左侧为书架区域，书架第一个项为“所有”，表示展示所有书，默认选中，“所有”下面是其他的各个书架，按照书架内书籍数量排序。书架名旁边展示其中书的数量。

2. 右侧为 main 区域
- 默认进入网页时，展示所有的书，当选中某个书架时展示书架内的所有书。支持按加入时间和 rating 排序。
- 当选中某译本书时，展示这本书的详情，包含标题，封面，作者，出版社，出版时间，rating, 笔记（notes）

3. 页面上方有一个大搜索框，支持按照标题，作者，笔记搜索
- 搜索列出排名前十的匹配项（如果有），并且把匹配内容部分节选缩略展示并高亮。
- 键盘交互：
  - `Command + K`（mac）/ `Ctrl + K`（Windows/Linux）聚焦到搜索框
  - 在搜索结果中可用 `↑` / `↓` 上下移动选中项
  - 按 `Enter` 选中当前高亮结果并打开对应书籍

⸻

4. 数据设计

⸻

4.1 源数据（手动维护）

路径：

/content/books/

每本书一个 Markdown 文件：

示例：atomic-habits.md

---
id: atomic-habits
title: Atomic Habits
author: James Clear
publisher: Avery
publishedAt: 2018-10-16
rating: 4.5
addedAt: 2026-03-21T08:00:00+09:00
shelves:
  - Self-help
  - Habit
cover: /static/covers/atomic-habits.jpg

# 可选增强字段（未来）
summary: 一本关于习惯养成的书
keywords:
  - habit
  - behavior
---

# Notes

这是一本关于习惯养成的经典书籍……


⸻

4.2 静态资源

/static/covers/


⸻

5. 构建产物（关键）

所有前端只消费 /public/data 下的数据。

⸻

5.1 书籍列表（轻量）

/public/data/books.json

[
  {
    "id": "atomic-habits",
    "title": "Atomic Habits",
    "author": "James Clear",
    "rating": 4.5,
    "addedAt": "2026-03-21T08:00:00+09:00",
    "shelves": ["Self-help"],
    "cover": "/static/covers/atomic-habits.jpg"
  }
]

👉 不包含 notes

⸻

5.2 书籍详情（按需加载）

/public/data/books/{id}.json

{
  "id": "atomic-habits",
  "title": "Atomic Habits",
  "author": "James Clear",
  "publisher": "Avery",
  "publishedAt": "2018-10-16",
  "rating": 4.5,
  "shelves": ["Self-help"],
  "cover": "/static/covers/atomic-habits.jpg",
  "notes": "完整笔记内容"
}


⸻

5.3 书架统计

/public/data/shelves.json

[
  { "name": "Self-help", "count": 12 },
  { "name": "Tech", "count": 8 }
]


⸻

5.4 搜索索引

/public/data/search-index.json

结构（简化 + 去冗余）：

[
  {
    "id": "atomic-habits",
    "title": "Atomic Habits",
    "author": "James Clear",
    "tokens": ["habit", "behavior", "self-discipline"]
  }
]


⸻

6. 前端架构

推荐技术栈：
	•	React + Vite（简单直接）
	•	或 Astro（更轻量）

⸻

6.1 页面结构

/src/
  pages/
    Home.tsx
    BookDetail.tsx

  components/
    BookCard.tsx
    Sidebar.tsx
    SearchBar.tsx


⸻

6.2 数据加载策略（必须遵守）

场景	数据
首页	books.json
书架	shelves.json
搜索	search-index.json
详情页	books/{id}.json

👉 严禁首页加载全部详情

⸻

7. 搜索实现

⸻

7.1 技术选型

推荐：
	•	MiniSearch（优先）
	•	或 FlexSearch（性能更强）

⸻

7.2 初始化流程

const index = new MiniSearch({
  fields: ['title', 'author', 'tokens'],
  storeFields: ['id', 'title']
})

index.addAll(searchIndexData)


⸻

7.3 搜索逻辑

const results = index.search(query, {
  prefix: true,
  fuzzy: 0.2
})


⸻

8. 构建系统（核心）

⸻

8.1 技术

Node.js 脚本：

/scripts/build.ts


⸻

8.2 构建流程
	1.	扫描 /content/books/*.md
	2.	解析 frontmatter
	3.	提取 notes
	4.	生成：

	•	books.json
	•	books/{id}.json
	•	shelves.json
	•	search-index.json

⸻

8.3 伪代码

for each file:
  parse frontmatter
  parse notes

  add to books list (light)
  write detail file

  update shelves map
  build search tokens


⸻

10. 项目结构（最终）

repo/

  /content/books/
  /static/covers/

  /public/data/
    books.json
    shelves.json
    search-index.json
    books/

  /src/
  /scripts/build.ts

  package.json


⸻

11. 非目标（明确不做）

v1 不包含：
	•	用户系统
	•	在线编辑
	•	评论
	•	后端 API
	•	SQLite 前端查询
	•	实时同步

⸻

12. 实施步骤（给 coding agent）

⸻

Step 1

初始化项目：
	•	Vite + React
	•	GitHub Pages deploy

⸻

Step 2

实现 build script：
	•	解析 Markdown
	•	输出 JSON

⸻

Step 3

实现首页：
	•	加载 books.json
	•	渲染列表
	•	排序

⸻

Step 4

实现书架：
	•	加载 shelves.json
	•	筛选逻辑

⸻

Step 5

实现详情页：
	•	动态加载 /books/{id}.json

⸻

Step 6

实现搜索：
	•	加载 search-index.json
	•	MiniSearch 索引

⸻

Step 7（可选）

优化：
	•	debounce search
	•	高亮关键词
	•	URL query state

⸻

13. 关键约束（必须遵守）
	1.	不允许首页加载 notes
	2.	不允许一个 JSON 包含全部数据
	3.	不引入 SQLite
	4.	所有数据必须可由 /content 重建
	5.	前端必须支持 lazy loading

⸻

14. 一句话总结

这是一个：

“本地 Markdown → 构建 JSON → 前端静态查询”的读书系统

而不是：

“浏览器 SQLite / 重型数据系统”
