# CLAUDE.md - Nibandh Development Guide

This file provides guidance to Claude Code when working with the Nibandh codebase.

## Project Overview

Nibandh is a **Tauri + React desktop writing app** designed for authoring blog posts with a Notion-like interface. It features a Lexical-based rich text editor and publishes directly to a Git-based blog repository.

### Tech Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS, Lexical Editor
- **Backend:** Rust (Tauri 2.x)
- **State Management:** Zustand
- **UI Components:** shadcn/ui (Radix primitives)

## Project Structure

```
nibandh/
├── src/                          # React frontend
│   ├── App.tsx                   # Main app component
│   ├── components/
│   │   ├── blocks/editor-x/      # Lexical editor setup
│   │   │   ├── editor.tsx        # Editor wrapper
│   │   │   ├── nodes.ts          # Custom Lexical nodes
│   │   │   └── plugins.tsx       # Editor plugins & toolbar
│   │   ├── editor/               # Editor components
│   │   │   ├── MetadataPanel.tsx # Notion-style page header
│   │   │   ├── plugins/          # Lexical plugins
│   │   │   ├── transformers/     # Markdown transformers
│   │   │   └── themes/           # Editor theming
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx      # App title bar with sidebar toggle & settings
│   │   │   └── StatusBar.tsx     # Bottom status bar with publish buttons
│   │   ├── ui/                   # shadcn components
│   │   ├── Sidebar.tsx           # Draft list sidebar
│   │   ├── SettingsDialog.tsx    # Repository & theme settings
│   │   └── PublishDialog.tsx     # Git publish dialog
│   ├── stores/
│   │   └── draftStore.ts         # Zustand store for draft & settings state
│   ├── lib/
│   │   └── markdown.ts           # Lexical → Markdown converter
│   └── index.css                 # Global styles & CSS variables
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Tauri commands (settings, drafts, publish)
│   │   └── database.rs           # SQLite database for draft persistence
│   ├── Cargo.toml                # Rust dependencies
│   └── capabilities/
│       └── default.json          # Tauri permissions (dialog, etc.)
└── package.json
```

## Development Commands

```bash
# Start development server (hot reload)
npm run tauri dev

# Build production app
npm run tauri build

# Build debug app (faster, with debug symbols)
npm run tauri build -- --debug

# Run the built app
open src-tauri/target/debug/bundle/macos/Nibandh.app
```

## Key Features Implemented

### 1. Notion-Style Editor UI
- **MetadataPanel** (`src/components/editor/MetadataPanel.tsx`)
  - Large editable title (text-4xl)
  - Date display with calendar icon
  - Tag management with inline input
  - Description field
  - Cover image upload (drag/drop/paste)
  - Centered content with `max-w-3xl mx-auto`

### 2. Rich Text Editor
- **Lexical-based** with full formatting support
- **Toolbar** with pill-style button groups (`src/components/blocks/editor-x/plugins.tsx`)
  - Undo/Redo, Block format, Font controls, Text formatting
  - Alignment, Colors, Insert menu
  - Theme-aware styling (`bg-secondary dark:bg-zinc-800`)
- **Slash commands** - Type "/" for component picker
- **Markdown shortcuts** - Standard markdown syntax supported

### 3. Draft Persistence (SQLite)
- **SQLite database** (`src-tauri/src/database.rs`)
  - Drafts table with full metadata (title, tags, content, status, timestamps)
  - CRUD operations: save, get, list, delete drafts
  - Status tracking: `draft` | `synced` | `published`
- **Auto-save** - Debounced 2-second save after changes
- **Draft sidebar** (`src/components/Sidebar.tsx`)
  - Lists all drafts with status badges
  - Switch between drafts
  - Create new / delete drafts
- **Save status indicator** in StatusBar (Saved/Saving/Unsaved)

### 4. Settings & Configuration
- **SettingsDialog** (`src/components/SettingsDialog.tsx`)
  - Repository path picker with folder browser (Tauri dialog plugin)
  - Git repo validation (checks for .git directory)
  - Theme toggle (Light/Dark)
  - Toast notifications on save
- **Settings persistence** - Stored in app data directory as JSON

### 5. Publish Flow
- **Rust backend** (`src-tauri/src/lib.rs`)
  - `publish_draft` command - writes markdown, handles images, git commit/push
  - `sync_to_drafts` command - syncs draft to drafts branch
  - `get_repo_status` command - checks git status
- **PublishDialog** (`src/components/PublishDialog.tsx`)
  - Shows article details, slug, tags
  - Commit message input
  - Validation (title, tags, description, repo path required)
  - Calls Tauri command to publish
- **StatusBar buttons**
  - "Sync to Drafts" - Push to drafts branch for backup/sync
  - "Publish to Main" - Opens PublishDialog for git commit to main

### 6. Sync to Drafts Feature
- **`sync_to_drafts` Tauri command** (`src-tauri/src/lib.rs`)
  - Creates `drafts` branch if it doesn't exist
  - Switches to drafts branch, writes markdown file, commits, pushes with `-u` flag
  - Switches back to original branch after sync
  - Updates draft status to `synced` on success
- **Frontend integration** (`src/App.tsx`)
  - `handleSync` function with loading state (`isSyncing`)
  - Auto-saves unsaved draft before syncing
  - Toast notifications for success/failure
- **StatusBar UI** (`src/components/layout/StatusBar.tsx`)
  - Loading spinner during sync
  - Disabled state when no repo configured or draft unsaved

### 7. Theme Support
- Dark/Light mode toggle (in TitleBar and Settings)
- Theme applied via `.dark` class on `<html>`
- CSS variables in `src/index.css`
- Theme persisted in settings

### 8. ChatGPT-Style Sidebar Layout
- **Full-height sidebar** (`src/components/Sidebar.tsx`)
  - Sidebar spans entire window height (not below TitleBar)
  - Traffic light spacer (w-16) at top-left for macOS window controls
  - Collapse button and + button stacked vertically at right edge
  - Width reduced to `w-52` (208px) for compact design
- **App layout restructure** (`src/App.tsx`)
  - Layout changed from `flex-col` (TitleBar on top) to `flex` (Sidebar as sibling)
  - Sidebar is first child, main content column is second
- **TitleBar integration** (`src/components/layout/TitleBar.tsx`)
  - Shows "Open sidebar" button (PanelLeft icon) only when sidebar is collapsed
  - Button appears at consistent vertical position as sidebar's collapse button

### 9. Button Visibility Fixes (Tailwind v4 CSS Variable Issues)
- **Problem:** CSS variables (`bg-primary`, `text-primary-foreground`) not resolving in bundled app
- **Solution:** Use inline `style` props with explicit hex colors
- **Files fixed:**
  - `src/components/SettingsDialog.tsx` - "Save Settings" button with `backgroundColor: '#e4e4e7'`
  - `src/components/layout/StatusBar.tsx` - "Publish to Main" with `backgroundColor: '#16a34a'`
  - `src/components/ui/button.tsx` - Added `success` variant, explicit zinc colors
  - `src/index.css` - Removed duplicate `button:disabled { opacity: 0.5 }` that stacked with Tailwind

## Tauri Commands

### Settings Commands
| Command | Description |
|---------|-------------|
| `get_settings()` | Load settings from app data directory |
| `save_settings(settings)` | Save settings to disk |
| `validate_repo_path(path)` | Check if path is valid git repo |

### Draft CRUD Commands
| Command | Description |
|---------|-------------|
| `save_draft_to_db(draft)` | Create or update draft in SQLite |
| `get_draft_from_db(id)` | Load single draft by ID |
| `list_drafts()` | List all drafts (summary: id, title, status, updated_at) |
| `delete_draft(id)` | Remove draft from database |
| `get_latest_draft()` | Get most recently updated draft |
| `update_draft_status(id, status)` | Update draft status (draft/synced/published) |

### Publish Commands
| Command | Description |
|---------|-------------|
| `publish_draft(args)` | Write markdown, handle images, git commit/push to main |
| `sync_to_drafts(args)` | Sync draft to drafts branch (creates branch if needed) |
| `get_repo_status(repo_path)` | Get git status output |

### `publish_draft` Arguments
```typescript
{
  slug: string;           // URL slug for the article
  title: string;          // Article title
  date: string;           // ISO date string
  tags: string[];         // Array of tags
  description: string;    // Article description
  cover: string;          // Base64 image or path
  content: string;        // Markdown content
  commitMessage: string;  // Git commit message
  repoPath: string;       // Path to blog repository
}
```

**Returns:** `{ success: boolean; message: string; file_path?: string }`

### `sync_to_drafts` Arguments
```typescript
{
  slug: string;           // URL slug for the article
  title: string;          // Article title
  date: string;           // ISO date string
  tags: string[];         // Array of tags
  description: string;    // Article description
  cover: string;          // Base64 image or path
  content: string;        // Markdown content
  repoPath: string;       // Path to blog repository
  draftId: string;        // Draft ID for tracking
}
```

**Returns:** `{ success: boolean; message: string; branch: string }`

## Configuration

### Data Storage Locations
- **Settings:** `~/Library/Application Support/com.pranavhari.nibandh/settings.json`
- **SQLite Database:** `~/Library/Application Support/com.pranavhari.nibandh/drafts.db`

### Target Repository
Configured via Settings dialog (gear icon in title bar). User selects git repo path.

Articles are written to: `{repo}/content/articles/{slug}.md`
Images are saved to: `{repo}/content/images/`

## CSS Architecture

### Theme Variables (index.css)
- `:root` - Base light theme variables
- `.dark` - Dark theme overrides
- Uses `oklch()` color space for consistent colors

### Key CSS Fixes Applied
1. **Margin reset** - Changed from `* { margin: 0 }` to specific elements to allow Tailwind's `mx-auto` to work
2. **Textarea font** - Removed `font-size: 13px` from textarea to allow `text-4xl` on title
3. **Toolbar theme** - Uses `bg-secondary dark:bg-zinc-800` for theme-aware styling

## Known Issues / TODOs

### Implemented ✅
- [x] Draft persistence (SQLite database)
- [x] Settings panel for repo path configuration
- [x] Multi-draft support (sidebar with draft list)
- [x] Auto-save with status indicator
- [x] Git drafts branch sync (Sync to Drafts button)
- [x] ChatGPT-style sidebar layout with full-height sidebar

### Not Yet Implemented
- [ ] Inline image handling (only cover image works)
- [ ] Preview mode
- [ ] Search functionality
- [ ] Version history with restore

### Future Enhancements (from SPEC.md)
- Git branch sync with conflict resolution
- GitHub Actions build status polling
- macOS notifications on deploy

## Debugging Tips

### Slash Commands Not Working?
Check `component-picker-menu-plugin.tsx` - menu needs:
- `z-50` for proper stacking
- `bg-popover` for visibility
- `border border-border` for definition

### Toolbar Wrong Color in Light Mode?
Ensure toolbar groups use theme-aware classes:
```tsx
className="bg-secondary dark:bg-zinc-800 rounded-lg p-1"
```

### Content Not Centering?
1. Check parent has full width (`w-full`)
2. Centered container needs `relative` for absolute children
3. Ensure no `* { margin: 0 }` override in global CSS

### Buttons Invisible in Bundled App?
Tailwind v4 CSS variables may not resolve correctly in production builds:
1. Check if `bg-primary` / `text-primary-foreground` are causing issues
2. **Fix:** Use inline `style` props with explicit hex colors:
   ```tsx
   <Button style={{ backgroundColor: '#e4e4e7', color: '#18181b' }}>
   ```
3. Check for duplicate opacity rules (e.g., both Tailwind `disabled:opacity-50` and CSS `button:disabled { opacity: 0.5 }`)
4. For green buttons, use: `backgroundColor: '#16a34a'` (green-600)

## File Quick Reference

| Purpose | File |
|---------|------|
| Main app entry | `src/App.tsx` |
| Draft & settings state | `src/stores/draftStore.ts` |
| Editor setup | `src/components/blocks/editor-x/editor.tsx` |
| Toolbar/plugins | `src/components/blocks/editor-x/plugins.tsx` |
| Page header | `src/components/editor/MetadataPanel.tsx` |
| Publish dialog | `src/components/PublishDialog.tsx` |
| Settings dialog | `src/components/SettingsDialog.tsx` |
| Draft sidebar | `src/components/Sidebar.tsx` |
| Title bar | `src/components/layout/TitleBar.tsx` |
| Status bar | `src/components/layout/StatusBar.tsx` |
| Markdown export | `src/lib/markdown.ts` |
| Rust commands | `src-tauri/src/lib.rs` |
| SQLite database | `src-tauri/src/database.rs` |
| Tauri permissions | `src-tauri/capabilities/default.json` |
| Global styles | `src/index.css` |

## Rust Dependencies (Cargo.toml)

Key dependencies added for draft persistence:
```toml
rusqlite = { version = "0.31", features = ["bundled"] }
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
tauri-plugin-dialog = "2"
dirs = "5"
```
