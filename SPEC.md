# Nibandh (निबंध) - Product Specification

> A native macOS writing application for seamless drafting and publishing

**Version:** 1.0
**Last Updated:** January 2026
**Author:** Pranav Hari

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Product Vision](#product-vision)
4. [Core Requirements](#core-requirements)
5. [User Experience](#user-experience)
6. [Technical Architecture](#technical-architecture)
7. [Feature Specifications](#feature-specifications)
8. [Publishing Workflow](#publishing-workflow)
9. [Phased Delivery](#phased-delivery)
10. [Site Integration](#site-integration)
11. [Open Questions](#open-questions)

---

## Executive Summary

**Nibandh** (Hindi for "essay") is a native macOS desktop application that provides a distraction-free writing environment with direct publishing capabilities to a personal website. Built with Tauri (Rust + WebView), it offers the performance of a native app with the flexibility of web technologies.

### Key Value Propositions

- **Streamlined Workflow**: Draft → Edit → Publish in one application
- **Native Performance**: ~80MB memory footprint (vs 300MB+ for Electron)
- **Offline-First**: Full functionality without internet, sync when connected
- **Site-Accurate Preview**: See exactly how articles will appear before publishing
- **Git-Native Publishing**: Commits directly to your site repository

---

## Problem Statement

### Current Workflow (Pain Points)

```
Apple Notes → Export PDF → AI Tool → Convert to Markdown → Manual Git Commit → Push
```

**Issues:**
1. Multiple tool context switches
2. AI conversion introduces formatting errors
3. No preview of final rendering
4. Manual git operations for every publish
5. No draft versioning or sync between devices

### Desired Workflow

```
Nibandh → Write → Preview → Publish (one click)
```

---

## Product Vision

### Target User

A single user (author) who:
- Writes long-form content (articles, essays, technical posts)
- Publishes to a personal Next.js/Markdown-based website
- Values native app performance and keyboard-driven workflows
- Works across multiple Mac devices

### Design Principles

1. **Writing First**: UI gets out of the way; content is the focus
2. **Predictable**: What you see matches what gets published
3. **Fast**: Instant launch, no loading spinners, responsive interactions
4. **Reliable**: Never lose work; offline-capable; conflict-resistant

---

## Core Requirements

### Decisions Matrix

| Category | Requirement | Rationale |
|----------|-------------|-----------|
| **Platform** | Tauri 2.x (Rust + WebView) | Native performance (~80MB), cross-platform potential |
| **Editor Model** | WYSIWYG blocks | Matches Notion mental model; no raw markdown exposure |
| **Writing Style** | Non-linear, block-based | User jumps between sections, rearranges content |
| **Draft Storage** | Markdown files on disk | Portable, editable with other tools if needed |
| **Version Control** | Auto-save every 5 min, last 10 versions | Safety net without manual intervention |
| **Sync Strategy** | Same repo, `drafts` branch | Leverages existing git infrastructure |
| **Git Auth** | GitHub CLI (`gh`) | Existing authentication, easy setup |
| **Image Handling** | Clipboard paste → `/content/images/` | Direct save to repo, no intermediate storage |
| **Preview** | Bundled renderer with site CSS | Accurate representation without running dev server |
| **Organization** | Flat list + tags + search | Simple mental model, powerful filtering |
| **Theme** | Manual light/dark toggle | User control, not system-dependent |
| **Typography** | Serif font (literary feel) | Georgia, Merriweather, or similar |

---

## User Experience

### Application Behavior

| Aspect | Specification |
|--------|---------------|
| **App Presence** | Regular dock app + global hotkey |
| **Global Hotkey** | `Cmd+Shift+N` (customizable in settings) |
| **Launch Behavior** | Resume last opened draft |
| **Window Model** | Single main window with sidebar |

### Editor Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  ● ○ ○   Nibandh                                    ☀️/🌙  ─ □ x │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────┐ │
│ │ 🔍 Search   │ │                                             │ │
│ ├─────────────┤ │  [Cover Image Upload Area]                  │ │
│ │             │ │                                             │ │
│ │ ALL DRAFTS  │ │  ┌─ Metadata Panel ──────────────────────┐  │ │
│ │             │ │  │ Title: [________________]             │  │ │
│ │ ○ Draft 1   │ │  │ Tags:  [AI] [Tech] [+]               │  │ │
│ │ ● Draft 2 ← │ │  │ Desc:  [________________]             │  │ │
│ │ ○ Draft 3   │ │  └───────────────────────────────────────┘  │ │
│ │             │ │                                             │ │
│ │             │ │  ─────────────────────────────────────────  │ │
│ │ ───────────│ │                                             │ │
│ │ TAGS       │ │  Type / for commands...                     │ │
│ │ #AI (3)    │ │                                             │ │
│ │ #Tech (5)  │ │  Your content blocks here...                │ │
│ │ #Personal  │ │                                             │ │
│ │             │ │                                             │ │
│ └─────────────┘ │                                             │ │
│                 │ ┌─ Status Bar ─────────────────────────────┐│ │
│                 │ │ 1,234 words · 6 min read · Saved 2m ago  ││ │
│                 │ └──────────────────────────────────────────┘│ │
│                 │                        [Preview] [Publish]  │ │
│                 └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Block Insertion

**Slash Commands** (`/` trigger):
- `/h1`, `/h2`, `/h3` - Headings
- `/p` - Paragraph
- `/list` - Bullet list
- `/numbered` - Numbered list
- `/quote` - Blockquote
- `/code` - Code block (with language selector)
- `/image` - Image block
- `/table` - Table
- `/callout` - Callout/highlight box
- `/divider` - Horizontal rule
- `/collapse` - Collapsible section
- `/youtube` - YouTube embed
- `/spotify` - Spotify embed

**Floating Toolbar** (on text selection):
- Bold, Italic, Strikethrough
- Link, Code (inline)
- Highlight color

### Keyboard Shortcuts (Fixed Defaults)

| Action | Shortcut |
|--------|----------|
| New draft | `Cmd+N` |
| Save (manual) | `Cmd+S` |
| Publish | `Cmd+Shift+P` |
| Preview | `Cmd+P` |
| Bold | `Cmd+B` |
| Italic | `Cmd+I` |
| Link | `Cmd+K` |
| Undo | `Cmd+Z` |
| Redo | `Cmd+Shift+Z` |
| Search drafts | `Cmd+F` |
| Toggle sidebar | `Cmd+\` |
| Toggle dark mode | `Cmd+Shift+D` |

---

## Technical Architecture

### Recommended Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        Nibandh App                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Frontend (WebView)               │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │    │
│  │  │   React   │  │  TipTap   │  │  Tailwind CSS │   │    │
│  │  │  or Solid │  │  Editor   │  │    + Theme    │   │    │
│  │  └───────────┘  └───────────┘  └───────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                      Tauri IPC                              │
│                            │                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Backend (Rust)                    │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │    │
│  │  │    Git    │  │  SQLite   │  │  File System  │   │    │
│  │  │ (git2-rs) │  │ (rusqlite)│  │   (std::fs)   │   │    │
│  │  └───────────┘  └───────────┘  └───────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Technology Choices

| Layer | Recommended | Alternatives | Notes |
|-------|-------------|--------------|-------|
| **Runtime** | Tauri 2.x | - | Required for native packaging |
| **Frontend Framework** | React 18 | SolidJS, Svelte | React has best TipTap support |
| **Editor** | TipTap 2.x | Slate.js, ProseMirror | Block-based, extensible, active community |
| **Styling** | Tailwind CSS | CSS Modules | Matches site's existing stack |
| **State Management** | Zustand | Jotai, Redux Toolkit | Lightweight, TypeScript-friendly |
| **Git Operations** | git2-rs | Shell to `gh` CLI | Native Rust bindings preferred |
| **Database** | rusqlite | sled | For version history storage |
| **Markdown** | pulldown-cmark | - | Rust markdown parser for preview |

### File Structure

```
nibandh/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs              # App entry point
│   │   ├── commands/            # Tauri IPC commands
│   │   │   ├── drafts.rs        # Draft CRUD operations
│   │   │   ├── git.rs           # Git operations
│   │   │   ├── images.rs        # Image handling
│   │   │   └── versions.rs      # Version history
│   │   ├── storage/
│   │   │   ├── sqlite.rs        # Version database
│   │   │   └── filesystem.rs    # Draft file operations
│   │   └── git/
│   │       ├── sync.rs          # Sync operations
│   │       └── publish.rs       # Publishing flow
│   ├── tauri.conf.json          # Tauri config
│   └── Cargo.toml
├── src/                          # Frontend
│   ├── components/
│   │   ├── editor/
│   │   │   ├── Editor.tsx       # Main TipTap editor
│   │   │   ├── Toolbar.tsx      # Floating toolbar
│   │   │   ├── SlashMenu.tsx    # Slash command palette
│   │   │   └── blocks/          # Custom block components
│   │   ├── sidebar/
│   │   │   ├── DraftList.tsx
│   │   │   ├── TagFilter.tsx
│   │   │   └── Search.tsx
│   │   ├── metadata/
│   │   │   ├── MetadataPanel.tsx
│   │   │   ├── CoverUpload.tsx
│   │   │   └── TagInput.tsx
│   │   └── publish/
│   │       ├── PreviewModal.tsx
│   │       ├── PublishDialog.tsx
│   │       └── DiffViewer.tsx
│   ├── hooks/
│   │   ├── useDrafts.ts
│   │   ├── useVersions.ts
│   │   └── useGit.ts
│   ├── stores/
│   │   ├── draftStore.ts
│   │   └── settingsStore.ts
│   ├── lib/
│   │   ├── markdown.ts          # MD ↔ Block conversion
│   │   └── preview.ts           # Preview rendering
│   └── styles/
│       ├── globals.css
│       └── editor.css
├── package.json
└── vite.config.ts
```

### Data Models

```typescript
// Draft stored as markdown file with frontmatter
interface Draft {
  id: string;                    // UUID
  slug: string;                  // Filename (sans .md)
  title: string;
  date: string;                  // ISO date
  tags: string[];
  description: string;
  cover?: string;                // Image path
  content: string;               // Markdown body
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  isPublished: boolean;
}

// Version stored in SQLite
interface Version {
  id: string;
  draftId: string;
  content: string;               // Full markdown snapshot
  createdAt: Date;
}

// App settings stored in SQLite or JSON
interface Settings {
  repoPath: string;              // Cloned repo location
  repoUrl: string;               // GitHub URL
  theme: 'light' | 'dark';
  globalHotkey: string;
  lastOpenedDraftId?: string;
}
```

---

## Feature Specifications

### F1: Block Editor

**Description**: WYSIWYG editor using TipTap with custom block extensions.

**Block Types**:

| Block | Markdown Output | Notes |
|-------|-----------------|-------|
| Heading 1-3 | `# `, `## `, `### ` | With anchor ID generation |
| Paragraph | Plain text | Default block type |
| Bullet List | `- ` items | Supports nesting |
| Numbered List | `1. ` items | Auto-incrementing |
| Blockquote | `> ` | Styled with left border |
| Code Block | ` ``` lang ` | Language selector dropdown |
| Inline Code | `` `code` `` | Via toolbar or backticks |
| Image | `![alt](path)` | Clipboard paste support |
| Table | GFM tables | Column alignment support |
| Callout | `> [!NOTE]` | GitHub-style callouts |
| Divider | `---` | Horizontal rule |
| Collapsible | `<details>` | HTML passthrough |
| YouTube | `[Embedded content](url)` | URL paste detection |
| Spotify | `[Embedded content](url)` | URL paste detection |

**Block Operations**:
- Drag handle for reordering
- Block menu (duplicate, delete, convert type)
- Arrow key navigation between blocks

### F2: Image Handling

**Paste from Clipboard**:
1. Detect image paste event
2. Generate unique filename: `img_{timestamp}_{hash}.png`
3. Save to `{repoPath}/content/images/`
4. Insert image block with path `../images/{filename}`

**Requirements**:
- Support PNG, JPG, WebP, GIF
- Compress images over 1MB (optional, configurable)
- Show inline preview immediately
- Copy to `/site/public/images/` on publish

### F3: Cover Image

**Upload Flow**:
1. Dedicated drop zone in metadata panel
2. Paste or drag image file
3. Save as `cover_{slug}_{hash}.{ext}`
4. Store path in frontmatter `cover` field

**Display**:
- Thumbnail preview in metadata panel
- "Remove cover" button
- Optional (clear "no cover" state available)

### F4: Metadata Panel

**Fields**:

| Field | Type | Validation |
|-------|------|------------|
| Title | Text input | Required, max 200 chars |
| Tags | Tag input | Autocomplete from existing, free-form entry |
| Description | Textarea | Optional, max 500 chars, shown in previews |
| Cover | Image upload | Optional |
| Slug | Auto-generated | Shown on publish confirmation |

**Tag Autocomplete**:
- Fetch existing tags from published articles
- Show suggestions as user types
- Allow creating new tags freely

### F5: Auto-Save Versioning

**Behavior**:
- Save snapshot every 5 minutes if content changed
- Keep last 10 versions per draft
- Prune older versions automatically

**Version Browser**:
- Slide-out panel showing version history
- Timestamp + diff preview for each version
- "Restore this version" action
- Restored version becomes current (old current preserved as version)

**Storage**: SQLite database in app data directory

```sql
CREATE TABLE versions (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (draft_id) REFERENCES drafts(id)
);

CREATE INDEX idx_versions_draft ON versions(draft_id, created_at DESC);
```

### F6: Draft Sync (Git-Based)

**Strategy**: Drafts branch in same repo

**Sync Flow**:
1. On launch: `git fetch origin drafts`
2. Check for remote changes
3. If conflict: prefer local, backup remote as `{slug}_remote_{date}.md`
4. On draft save: commit to local drafts branch
5. On explicit sync or publish: push drafts branch

**Offline Behavior**:
- All operations work locally
- Sync queue stored for when connectivity returns
- Status indicator shows sync state

### F7: Full-Text Search

**Implementation**:
- SQLite FTS5 for fast text search
- Index: title, description, content, tags
- Update index on draft save

**UI**:
- Search bar in sidebar
- Real-time results as you type
- Highlight matches in results
- Filter by tag in conjunction with search

### F8: Word Count & Reading Time

**Display**: Status bar at bottom of editor

**Calculations**:
- Word count: Split on whitespace, count
- Reading time: `Math.ceil(wordCount / 200)` minutes
- Character count (optional toggle)

**Updates**: Debounced (500ms) during typing

### F9: Preview

**Bundled Preview Renderer**:
- Uses site's actual CSS (bundled at build time)
- Renders markdown with same plugins:
  - remark-gfm
  - rehype-raw
- Shows accurate representation including:
  - Cover image with gradient overlay
  - Typography and spacing
  - Code block styling
  - Embed rendering

**Preview Modal**:
- Full-screen modal with rendered article
- Toggle between light/dark theme
- Close button returns to editor

### F10: Publish Flow

**Pre-Publish Checks**:
1. Validate required frontmatter (title, date, tags, description)
2. Ensure all images exist in repo
3. Generate/confirm slug

**Publish Dialog**:

```
┌─────────────────────────────────────────────────────┐
│  Ready to Publish                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Title: My Article Title                            │
│  Slug: my-article-title                    [Edit]   │
│  Tags: AI, Tech                                     │
│                                                     │
│  ┌─ Changes ──────────────────────────────────────┐ │
│  │ + content/articles/my-article-title.md         │ │
│  │ + content/images/img_12345.png                 │ │
│  │ M site/public/images/ (copied)                 │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  Commit Message:                                    │
│  ┌────────────────────────────────────────────────┐ │
│  │ Add: My Article Title                          │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│                        [Cancel]  [Publish to Main]  │
└─────────────────────────────────────────────────────┘
```

**Publish Steps**:
1. Copy images to `/site/public/images/`
2. Copy markdown to `/content/articles/{slug}.md`
3. Stage files: `git add content/articles/{slug}.md content/images/* site/public/images/*`
4. Commit with user-provided message
5. Push to `main` branch
6. Mark draft as published
7. Poll GitHub Actions for build status

### F11: Build Status Notifications

**Implementation**:
1. After push, poll GitHub API for workflow runs
2. Show status in app: "Building...", "Deployed!", "Failed"
3. macOS notification on completion

**Polling Strategy**:
- Check every 10 seconds for 5 minutes
- Stop polling if status becomes terminal
- Use `gh api repos/{owner}/{repo}/actions/runs` via CLI

---

## Publishing Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Writing    │────▶│   Preview    │────▶│   Publish    │
│              │     │              │     │   Dialog     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  Confirm     │
                                          │  Slug/Commit │
                                          └──────┬───────┘
                                                  │
                     ┌────────────────────────────┼────────────────────────────┐
                     ▼                            ▼                            ▼
              ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
              │ Copy Images  │           │ Copy Article │           │   Git Add    │
              │ to public/   │           │ to content/  │           │   & Commit   │
              └──────────────┘           └──────────────┘           └──────┬───────┘
                                                                           │
                                                                           ▼
                                                                    ┌──────────────┐
                                                                    │   Git Push   │
                                                                    │   to main    │
                                                                    └──────┬───────┘
                                                                           │
                                                                           ▼
                                                                    ┌──────────────┐
                                                                    │ Poll GitHub  │
                                                                    │ Actions      │
                                                                    └──────┬───────┘
                                                                           │
                                                                           ▼
                                                                    ┌──────────────┐
                                                                    │ Notification │
                                                                    │ "Deployed!"  │
                                                                    └──────────────┘
```

---

## Phased Delivery

### MVP (Milestone 1)

**Goal**: Core writing and publishing functionality

**Features**:
- [x] Tauri app scaffold with React frontend
- [x] Lexical editor with basic blocks (headings, paragraphs, lists, code, images)
- [x] Frontmatter metadata panel (title, tags, description)
- [x] Image paste from clipboard
- [x] Publish flow with git commit/push
- [x] Basic settings (repo path, theme toggle)

**Not Included**:
- Version history
- Sync between devices
- Search
- Advanced blocks (tables, callouts, embeds)

### V1 (Milestone 2)

**Goal**: Complete core experience

**Features**:
- [x] Multi-draft support with sidebar
- [ ] Auto-save versioning (5 min, 10 versions)
- [x] Git-based sync (drafts branch)
- [x] Bundled preview with site CSS (basic alignment with site styles)
- [ ] Full-text search
- [x] Word count / reading time
- [x] Cover image upload + reposition
- [ ] Tag autocomplete
- [ ] Slug confirmation on publish

### V2 (Milestone 3)

**Goal**: Polish and advanced features

**Features**:
- [ ] Full block type support (tables, callouts, collapsibles, embeds) — partial support exists
- [ ] GitHub Actions build status notifications
- [ ] Global hotkey (`Cmd+Shift+N`)
- [ ] Onboarding flow (clone repo from URL)
- [ ] `gh` CLI installation helper
- [ ] Conflict resolution UI
- [ ] Settings panel (fonts, hotkeys, sync frequency)
- [ ] Performance optimizations

---

## Site Integration

### Target Repository Structure

```
nextjs-notion-starter-kit/
├── site/
│   ├── content/
│   │   ├── articles/          # ← Published articles go here
│   │   │   └── {slug}.md
│   │   └── images/            # ← Article images go here
│   │       └── {image}.{ext}
│   ├── public/
│   │   └── images/            # ← Copied from content/images on publish
│   └── src/
│       └── ...
└── drafts/                    # ← Drafts stored here (on drafts branch)
    └── {slug}.md
```

### Frontmatter Schema

```yaml
---
title: "Article Title"          # Required
date: "2026-01-15"             # Required, ISO format
tags: ["AI", "Tech"]           # Required, array
description: "Preview text"     # Required, for meta/cards
cover: "/images/cover.webp"    # Optional, path from public
draft: false                   # Optional, defaults false
---
```

### Image Path Resolution

| Context | Path Format |
|---------|-------------|
| In markdown body | `../images/{filename}` (relative) |
| In frontmatter cover | `/images/{filename}` (absolute from public) |
| On disk (source) | `{repo}/content/images/{filename}` |
| On disk (public) | `{repo}/site/public/images/{filename}` |

### CSS Theme Variables

Nibandh bundles the site's CSS variables for accurate preview:

```css
:root {
  --background: #F2F2F7;
  --foreground: #000000;
  --muted: #8E8E93;
  --accent: #007AFF;
  --border: #C6C6C8;
}

.dark {
  --background: #000000;
  --foreground: #FFFFFF;
  --muted: #8E8E93;
  --accent: #0A84FF;
  --border: #38383A;
}
```

### Markdown Processing

Preview uses identical plugins to site:
- `remark-gfm` for tables, strikethrough, autolinks
- `rehype-raw` for HTML passthrough (`<details>`, etc.)

---

## Onboarding Flow

### First Launch

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│        Welcome to Nibandh                           │
│                                                     │
│        Let's set up your writing space              │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  GitHub Repository URL                       │   │
│  │  [https://github.com/user/repo              ]│   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Nibandh will clone this repository and use it     │
│  for publishing your articles.                      │
│                                                     │
│                               [Continue →]          │
└─────────────────────────────────────────────────────┘
```

### GitHub CLI Check

If `gh` is not installed:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  GitHub CLI Required                                │
│                                                     │
│  Nibandh uses the GitHub CLI for authentication.   │
│                                                     │
│  [Install GitHub CLI]                              │
│                                                     │
│  This will run: brew install gh                    │
│                                                     │
│                        [Skip]  [Install & Continue] │
└─────────────────────────────────────────────────────┘
```

After installation: `gh auth login` flow

---

## Open Questions

1. **Markdown ↔ Block Conversion Fidelity**: How to handle edge cases where markdown doesn't round-trip perfectly through WYSIWYG?

2. **Image Optimization**: Should we auto-compress/convert images to WebP on paste? What about existing images?

3. **Collaborative Future**: Any future plans for real-time collaboration would require architectural changes. Document as out-of-scope?

4. **Mobile Companion**: Interest in iOS/iPadOS version for on-the-go writing? Would require separate spec.

5. **Backup Strategy**: Beyond git, should there be local Time Machine-style backups of all drafts?

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Draft** | Unpublished article stored on drafts branch |
| **Published** | Article merged to main and deployed |
| **Block** | Individual content unit in editor (paragraph, heading, etc.) |
| **Frontmatter** | YAML metadata at top of markdown file |
| **Slug** | URL-friendly filename derived from title |

---

## Appendix B: Acceptance Criteria Template

For each feature, implementation should satisfy:

```
GIVEN [precondition]
WHEN [action]
THEN [expected result]
```

Example for Image Paste:
```
GIVEN I am editing a draft
WHEN I paste an image from clipboard (Cmd+V)
THEN the image is saved to content/images/
AND an image block appears in the editor
AND the block shows an inline preview
```

---

*End of Specification*
