# Nibandh - Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Nibandh                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     FRONTEND (WebView)                          │   │
│  │                                                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │   │
│  │  │    React    │  │   TipTap    │  │      Zustand Store      │ │   │
│  │  │ Components  │  │   Editor    │  │   (drafts, settings)    │ │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │   │
│  │         │                │                      │              │   │
│  │         └────────────────┼──────────────────────┘              │   │
│  │                          │                                     │   │
│  │                    Tauri Commands                              │   │
│  │                     (invoke API)                               │   │
│  └──────────────────────────┼─────────────────────────────────────┘   │
│                             │                                          │
│  ═══════════════════════════╪══════════════════════════════════════   │
│                       IPC Bridge                                       │
│  ═══════════════════════════╪══════════════════════════════════════   │
│                             │                                          │
│  ┌──────────────────────────┴─────────────────────────────────────┐   │
│  │                     BACKEND (Rust)                             │   │
│  │                                                                │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │                    Command Handlers                     │  │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │   │
│  │  │  │ drafts:: │ │ images:: │ │versions::│ │   git::   │  │  │   │
│  │  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │  │   │
│  │  └───────┼────────────┼────────────┼─────────────┼────────┘  │   │
│  │          │            │            │             │           │   │
│  │  ┌───────┴────────────┴────────────┴─────────────┴────────┐  │   │
│  │  │                    Service Layer                       │  │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │   │
│  │  │  │ DraftService │  │VersionService│  │  GitService  │ │  │   │
│  │  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │  │   │
│  │  └─────────┼─────────────────┼─────────────────┼─────────┘  │   │
│  │            │                 │                 │            │   │
│  │  ┌─────────┴─────────────────┴─────────────────┴─────────┐  │   │
│  │  │                    Storage Layer                      │  │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│  │   │
│  │  │  │  Filesystem  │  │    SQLite    │  │   git2-rs    ││  │   │
│  │  │  │   (drafts)   │  │  (versions)  │  │  (git ops)   ││  │   │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘│  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Tree

```
App
├── Layout
│   ├── TitleBar (custom, draggable)
│   ├── Sidebar
│   │   ├── SearchInput
│   │   ├── DraftList
│   │   │   └── DraftItem (×n)
│   │   └── TagFilter
│   │       └── TagChip (×n)
│   └── MainContent
│       ├── MetadataPanel
│       │   ├── TitleInput
│       │   ├── TagInput
│       │   ├── DescriptionInput
│       │   └── CoverUpload
│       ├── Editor
│       │   ├── TipTapEditor
│       │   ├── SlashCommandMenu
│       │   ├── FloatingToolbar
│       │   └── BlockMenu
│       └── StatusBar
│           ├── WordCount
│           ├── ReadingTime
│           ├── SaveStatus
│           └── SyncStatus
├── Modals
│   ├── PreviewModal
│   ├── PublishDialog
│   ├── VersionHistory
│   └── SettingsModal
└── Notifications
    └── Toast (×n)
```

### State Management (Zustand)

```typescript
// stores/draftStore.ts
interface DraftStore {
  // State
  drafts: Draft[];
  currentDraftId: string | null;
  isLoading: boolean;
  searchQuery: string;
  selectedTags: string[];

  // Actions
  loadDrafts: () => Promise<void>;
  createDraft: () => Promise<Draft>;
  updateDraft: (id: string, updates: Partial<Draft>) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  setCurrentDraft: (id: string) => void;
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;

  // Computed (via selectors)
  filteredDrafts: () => Draft[];
  currentDraft: () => Draft | null;
  allTags: () => string[];
}

// stores/settingsStore.ts
interface SettingsStore {
  repoPath: string;
  repoUrl: string;
  theme: 'light' | 'dark';
  globalHotkey: string;

  setTheme: (theme: 'light' | 'dark') => void;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
}

// stores/editorStore.ts
interface EditorStore {
  content: JSONContent;  // TipTap JSON
  isDirty: boolean;
  lastSaved: Date | null;

  setContent: (content: JSONContent) => void;
  markClean: () => void;
}
```

### TipTap Editor Configuration

```typescript
// components/editor/Editor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import { SlashCommands } from './extensions/SlashCommands';
import { Callout } from './extensions/Callout';
import { Collapsible } from './extensions/Collapsible';
import { Embed } from './extensions/Embed';

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false, // Use lowlight version
    }),
    Image.configure({
      allowBase64: false,
      HTMLAttributes: { class: 'rounded-lg max-w-full' },
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'javascript',
    }),
    Placeholder.configure({
      placeholder: 'Type / for commands...',
    }),
    SlashCommands,
    Callout,
    Collapsible,
    Embed,
  ],
  content: initialContent,
  onUpdate: ({ editor }) => {
    editorStore.setContent(editor.getJSON());
  },
});
```

### Custom Extensions

```typescript
// extensions/Callout.ts
import { Node, mergeAttributes } from '@tiptap/core';

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      type: {
        default: 'note',
        parseHTML: el => el.getAttribute('data-type'),
        renderHTML: attrs => ({ 'data-type': attrs.type }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0];
  },
});

// extensions/Embed.ts
export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      type: { default: 'youtube' }, // 'youtube' | 'spotify'
    };
  },

  renderHTML({ node }) {
    const { src, type } = node.attrs;
    return [
      'div',
      { class: 'embed-container' },
      ['iframe', { src, class: type === 'spotify' ? 'spotify-embed' : 'youtube-embed' }],
    ];
  },
});
```

---

## Backend Architecture (Rust)

### Module Structure

```
src-tauri/src/
├── main.rs                 # Entry point, Tauri setup
├── commands/
│   ├── mod.rs
│   ├── drafts.rs          # Draft CRUD commands
│   ├── versions.rs        # Version history commands
│   ├── images.rs          # Image handling commands
│   ├── git.rs             # Git operations commands
│   └── settings.rs        # Settings commands
├── services/
│   ├── mod.rs
│   ├── draft_service.rs   # Draft business logic
│   ├── version_service.rs # Version management
│   ├── image_service.rs   # Image processing
│   └── git_service.rs     # Git operations
├── storage/
│   ├── mod.rs
│   ├── filesystem.rs      # File I/O operations
│   └── database.rs        # SQLite operations
├── models/
│   ├── mod.rs
│   ├── draft.rs           # Draft struct
│   ├── version.rs         # Version struct
│   └── settings.rs        # Settings struct
└── utils/
    ├── mod.rs
    ├── markdown.rs        # Markdown parsing
    └── slug.rs            # Slug generation
```

### Command Examples

```rust
// commands/drafts.rs
use tauri::State;
use crate::services::DraftService;
use crate::models::Draft;

#[tauri::command]
pub async fn list_drafts(
    service: State<'_, DraftService>
) -> Result<Vec<Draft>, String> {
    service.list_all()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_draft(
    id: String,
    service: State<'_, DraftService>
) -> Result<Draft, String> {
    service.get(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_draft(
    draft: Draft,
    service: State<'_, DraftService>
) -> Result<Draft, String> {
    service.save(&draft)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_draft(
    id: String,
    service: State<'_, DraftService>
) -> Result<(), String> {
    service.delete(&id)
        .map_err(|e| e.to_string())
}
```

```rust
// commands/git.rs
#[tauri::command]
pub async fn publish_draft(
    draft_id: String,
    commit_message: String,
    git_service: State<'_, GitService>,
    draft_service: State<'_, DraftService>,
) -> Result<PublishResult, String> {
    let draft = draft_service.get(&draft_id)?;

    // 1. Copy images to public folder
    git_service.copy_images(&draft)?;

    // 2. Write article to content/articles
    git_service.write_article(&draft)?;

    // 3. Stage changes
    git_service.stage_files(&[
        format!("content/articles/{}.md", draft.slug),
        "content/images/*".to_string(),
        "site/public/images/*".to_string(),
    ])?;

    // 4. Commit
    git_service.commit(&commit_message)?;

    // 5. Push to main
    git_service.push("main")?;

    // 6. Mark draft as published
    draft_service.mark_published(&draft_id)?;

    Ok(PublishResult { success: true, commit_sha: "..." })
}

#[tauri::command]
pub async fn get_build_status(
    git_service: State<'_, GitService>,
) -> Result<BuildStatus, String> {
    // Use gh CLI to check workflow status
    git_service.check_actions_status()
        .map_err(|e| e.to_string())
}
```

### Service Layer

```rust
// services/draft_service.rs
use std::path::PathBuf;
use crate::storage::{FileSystem, Database};
use crate::models::Draft;

pub struct DraftService {
    fs: FileSystem,
    db: Database,
    drafts_path: PathBuf,
}

impl DraftService {
    pub fn new(repo_path: &PathBuf) -> Self {
        let drafts_path = repo_path.join("drafts");
        Self {
            fs: FileSystem::new(),
            db: Database::new(&repo_path.join(".nibandh/versions.db")),
            drafts_path,
        }
    }

    pub fn list_all(&self) -> Result<Vec<Draft>, Error> {
        let files = self.fs.list_markdown_files(&self.drafts_path)?;
        files.iter()
            .map(|f| self.parse_draft(f))
            .collect()
    }

    pub fn save(&self, draft: &Draft) -> Result<Draft, Error> {
        let path = self.drafts_path.join(format!("{}.md", draft.slug));
        let content = self.serialize_draft(draft);
        self.fs.write_file(&path, &content)?;
        Ok(draft.clone())
    }

    fn parse_draft(&self, path: &PathBuf) -> Result<Draft, Error> {
        let content = self.fs.read_file(path)?;
        let (frontmatter, body) = parse_frontmatter(&content)?;
        Ok(Draft {
            id: generate_id(),
            slug: path.file_stem().unwrap().to_string_lossy().to_string(),
            title: frontmatter.title,
            date: frontmatter.date,
            tags: frontmatter.tags,
            description: frontmatter.description,
            cover: frontmatter.cover,
            content: body,
            // ...
        })
    }

    fn serialize_draft(&self, draft: &Draft) -> String {
        format!(
            "---\ntitle: \"{}\"\ndate: \"{}\"\ntags: {:?}\ndescription: \"{}\"\n{}---\n\n{}",
            draft.title,
            draft.date,
            draft.tags,
            draft.description,
            draft.cover.map(|c| format!("cover: \"{}\"\n", c)).unwrap_or_default(),
            draft.content,
        )
    }
}
```

### Git Service

```rust
// services/git_service.rs
use git2::{Repository, Signature, Commit};
use std::process::Command;

pub struct GitService {
    repo: Repository,
    repo_path: PathBuf,
}

impl GitService {
    pub fn new(repo_path: &PathBuf) -> Result<Self, Error> {
        let repo = Repository::open(repo_path)?;
        Ok(Self { repo, repo_path: repo_path.clone() })
    }

    pub fn sync_drafts(&self) -> Result<(), Error> {
        // Fetch remote drafts branch
        self.run_git(&["fetch", "origin", "drafts"])?;

        // Check for conflicts
        let local_commit = self.get_branch_commit("drafts")?;
        let remote_commit = self.get_branch_commit("origin/drafts")?;

        if self.has_conflicts(&local_commit, &remote_commit)? {
            // Prefer local, backup remote
            self.backup_remote_changes()?;
        } else {
            // Fast-forward merge
            self.run_git(&["merge", "origin/drafts"])?;
        }

        Ok(())
    }

    pub fn push(&self, branch: &str) -> Result<(), Error> {
        self.run_git(&["push", "origin", branch])
    }

    pub fn check_actions_status(&self) -> Result<BuildStatus, Error> {
        // Use gh CLI
        let output = Command::new("gh")
            .args(&["api", "repos/{owner}/{repo}/actions/runs", "--jq", ".workflow_runs[0]"])
            .current_dir(&self.repo_path)
            .output()?;

        let json: serde_json::Value = serde_json::from_slice(&output.stdout)?;
        Ok(BuildStatus {
            status: json["status"].as_str().unwrap_or("unknown").to_string(),
            conclusion: json["conclusion"].as_str().map(String::from),
        })
    }

    fn run_git(&self, args: &[&str]) -> Result<(), Error> {
        let output = Command::new("git")
            .args(args)
            .current_dir(&self.repo_path)
            .output()?;

        if !output.status.success() {
            return Err(Error::GitError(String::from_utf8_lossy(&output.stderr).to_string()));
        }
        Ok(())
    }
}
```

---

## Database Schema

```sql
-- Version history (SQLite)
CREATE TABLE IF NOT EXISTS versions (
    id TEXT PRIMARY KEY,
    draft_id TEXT NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_versions_draft_date
ON versions(draft_id, created_at DESC);

-- Full-text search
CREATE VIRTUAL TABLE drafts_fts USING fts5(
    id,
    title,
    description,
    content,
    tags,
    content='drafts',
    content_rowid='rowid'
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Sync queue (for offline operations)
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    operation TEXT NOT NULL,  -- 'commit', 'push', 'pull'
    data TEXT,                -- JSON payload
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending'
);
```

---

## IPC Commands Reference

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `list_drafts` | - | `Draft[]` | Get all drafts |
| `get_draft` | `id: string` | `Draft` | Get single draft |
| `save_draft` | `draft: Draft` | `Draft` | Save/update draft |
| `delete_draft` | `id: string` | `void` | Delete draft |
| `create_draft` | - | `Draft` | Create empty draft |
| `get_versions` | `draftId: string` | `Version[]` | Get version history |
| `restore_version` | `versionId: string` | `Draft` | Restore to version |
| `save_image` | `base64: string, filename?: string` | `string` | Save clipboard image |
| `publish_draft` | `draftId: string, commitMessage: string` | `PublishResult` | Publish to site |
| `sync_drafts` | - | `SyncResult` | Sync with remote |
| `get_build_status` | - | `BuildStatus` | Check GitHub Actions |
| `get_settings` | - | `Settings` | Get app settings |
| `save_settings` | `settings: Settings` | `void` | Update settings |
| `search_drafts` | `query: string` | `Draft[]` | Full-text search |
| `get_all_tags` | - | `string[]` | Get unique tags |

---

## File Formats

### Draft File (Markdown)

```markdown
---
title: "My Article Title"
date: "2026-01-15"
tags: ["AI", "Technology", "Startups"]
description: "A brief description for previews and SEO"
cover: "/images/cover-my-article.webp"
---

# Introduction

Your content here using standard markdown...

![An image](../images/img_abc123.png)

## Code Example

```javascript
const hello = "world";
```

<details>
<summary>Expandable section</summary>

Hidden content here...
</details>

[Embedded content](https://www.youtube.com/embed/dQw4w9WgXcQ)
```

### Settings File (JSON)

```json
{
  "repoPath": "/Users/username/site-repo",
  "repoUrl": "https://github.com/username/site-repo",
  "theme": "dark",
  "globalHotkey": "CommandOrControl+Shift+N",
  "lastOpenedDraftId": "abc123",
  "editorFont": "Georgia",
  "autoSaveInterval": 300000,
  "maxVersions": 10
}
```

---

## Performance Considerations

### Memory Budget

| Component | Target | Notes |
|-----------|--------|-------|
| Tauri runtime | ~30MB | Native, minimal |
| WebView | ~40MB | Shared with system |
| SQLite | ~5MB | Embedded, efficient |
| TipTap editor | ~10MB | Depends on document size |
| **Total** | **~85MB** | vs Electron ~300MB |

### Optimization Strategies

1. **Lazy Loading**: Only load draft content when opened
2. **Virtual Scrolling**: For long draft lists
3. **Debounced Saves**: 500ms delay on content changes
4. **Image Compression**: Optional WebP conversion on paste
5. **Incremental Search**: Use FTS5 for fast queries

---

## Security Considerations

1. **Git Credentials**: Use `gh` CLI, never store tokens directly
2. **Local Storage**: SQLite in app data directory (sandboxed)
3. **IPC Validation**: Validate all command parameters
4. **Path Traversal**: Sanitize all file paths
5. **XSS Prevention**: Sanitize markdown preview output

---

## Build & Distribution

### Development

```bash
# Install dependencies
npm install
cd src-tauri && cargo build

# Run development
npm run tauri dev
```

### Production Build

```bash
# Build for macOS
npm run tauri build

# Output: src-tauri/target/release/bundle/
# - Nibandh.app (application bundle)
# - Nibandh.dmg (distributable)
```

### Code Signing (macOS)

```bash
# Sign for distribution
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name" \
  Nibandh.app

# Notarize
xcrun notarytool submit Nibandh.dmg \
  --apple-id "your@email.com" \
  --team-id "TEAMID" \
  --password "@keychain:AC_PASSWORD"
```

---

*End of Architecture Document*
