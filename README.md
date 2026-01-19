# Nibandh

A native macOS writing app built with Tauri + React that lets you draft in a Notion‑style editor and publish directly to a Git‑backed blog.

## What It Does

- Write with a Lexical‑based rich text editor
- Store drafts locally (SQLite)
- Publish Markdown + images to a git repo
- Sync drafts to a `drafts` branch
- Preview with styling aligned to your site (here it is aligned to my personal site @ pranavhari.com)

## How Publishing Works

Nibandh converts editor content to Markdown and writes it into your blog repo:

```
{repo}/content/articles/{slug}.md
{repo}/content/images/{image}.{ext}
```

It commits and pushes to `main` for publish, and to `drafts` for sync.

## Setup

1) Install dependencies
```
npm install
```

2) Start the app
```
npm run tauri dev
```

3) Configure your repo
- Open **Settings** in the app
- Set **Repository Path** to the root of your blog repo
- Confirm “Valid git repository” shows

## First Publish Walkthrough

1) Open Nibandh and create or select a draft.
2) Add title, tags, and description (required for publish).
3) Add a cover image if desired (upload or link, then reposition).
4) Write your content. You can paste images inline.
5) Click **Preview** to verify styling.
6) Click **Publish to Main** in the status bar.
7) Review the summary and commit message, then confirm.
8) Nibandh writes Markdown + images and pushes to `main`.

## What Your Blog Repo Must Provide

Nibandh assumes a simple Markdown‑based blog repo. You can adapt it, but these defaults must exist (or be created on publish):

- `content/articles/` — Markdown files
- `content/images/` — image assets
- `drafts/` — draft branch content

## Frontmatter Schema

Nibandh writes YAML frontmatter at the top of each Markdown file:

```yaml
---
title: "Article Title"
date: "2026-01-15"
tags: ["AI", "Tech"]
description: "Short summary"
cover: "/images/cover-image.webp"
cover_position: 50
---
```

## Customization Points

If your blog uses different paths or frontmatter fields, update these areas:

- **Publish paths & frontmatter**
  - `src-tauri/src/lib.rs` (`publish_draft` and `sync_to_drafts`)
- **Markdown conversion**
  - `src/lib/markdown.ts`
- **Preview styling**
  - `src/components/PreviewDialog.tsx`
  - `src/index.css`

## Images

- Pasted images are embedded in the editor and saved as WebP on publish.
- Cover images can be uploaded or linked, and repositioned.

## Development Notes

- Frontend: React + TypeScript + Tailwind + Lexical
- Backend: Rust + Tauri 2
- State: Zustand
- DB: SQLite in app data directory

## Build

```
npm run tauri build
```

## Troubleshooting

- **Publish fails:** verify `repoPath` points to a git repo and `git status` is clean.
- **Sync fails:** the app auto‑stashes local changes to switch branches.

## License

MIT
