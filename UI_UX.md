# Nibandh - UI/UX Specifications

## Design Philosophy

**Core Principles:**
1. **Content-First**: Writing should feel like a blank canvas, not a software interface
2. **Calm Aesthetics**: Muted colors, generous whitespace, no visual clutter
3. **Predictable Interactions**: Familiar patterns from Notion, Apple Notes, Obsidian
4. **Literary Feel**: Serif typography evokes traditional writing

---

## Design Tokens

### Colors

#### Light Theme

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#FAFAFA` | Main background |
| `--bg-secondary` | `#F5F5F5` | Sidebar, panels |
| `--bg-tertiary` | `#EEEEEE` | Hover states, cards |
| `--text-primary` | `#1A1A1A` | Body text |
| `--text-secondary` | `#666666` | Metadata, hints |
| `--text-muted` | `#999999` | Placeholders, timestamps |
| `--accent` | `#007AFF` | Links, active states |
| `--accent-hover` | `#0056B3` | Hover on accent |
| `--border` | `#E0E0E0` | Dividers, outlines |
| `--success` | `#34C759` | Published, synced |
| `--warning` | `#FF9500` | Unsaved changes |
| `--error` | `#FF3B30` | Errors, conflicts |

#### Dark Theme

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#1A1A1A` | Main background |
| `--bg-secondary` | `#242424` | Sidebar, panels |
| `--bg-tertiary` | `#2E2E2E` | Hover states, cards |
| `--text-primary` | `#FAFAFA` | Body text |
| `--text-secondary` | `#A0A0A0` | Metadata, hints |
| `--text-muted` | `#666666` | Placeholders, timestamps |
| `--accent` | `#0A84FF` | Links, active states |
| `--accent-hover` | `#409CFF` | Hover on accent |
| `--border` | `#3A3A3A` | Dividers, outlines |
| `--success` | `#30D158` | Published, synced |
| `--warning` | `#FFD60A` | Unsaved changes |
| `--error` | `#FF453A` | Errors, conflicts |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-serif` | `Georgia, "Times New Roman", serif` | Editor body text |
| `--font-sans` | `"SF Pro Text", -apple-system, sans-serif` | UI, metadata |
| `--font-mono` | `"SF Mono", "JetBrains Mono", monospace` | Code blocks |
| `--text-xs` | `12px` | Timestamps, badges |
| `--text-sm` | `14px` | Metadata, sidebar |
| `--text-base` | `16px` | Body text |
| `--text-lg` | `18px` | H3 headings |
| `--text-xl` | `22px` | H2 headings |
| `--text-2xl` | `28px` | H1 headings |
| `--text-3xl` | `36px` | Article title |
| `--line-height` | `1.7` | Body text reading |

### Spacing

| Token | Value |
|-------|-------|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Dropdowns, popovers |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dialogs |

### Border Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--radius-full` | `9999px` |

---

## Layout

### Window Dimensions

| Property | Value |
|----------|-------|
| Min width | 900px |
| Min height | 600px |
| Default width | 1200px |
| Default height | 800px |
| Max width | None (resizable) |

### Grid Structure

```
┌──────────────────────────────────────────────────────────────┐
│ Title Bar (32px, draggable)                                  │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│   Sidebar    │                 Main Content                  │
│   (240px)    │                 (flex: 1)                     │
│              │                                               │
│              │  ┌─────────────────────────────────────────┐ │
│              │  │ Metadata Panel (auto height, collapsed) │ │
│              │  └─────────────────────────────────────────┘ │
│              │                                               │
│              │  ┌─────────────────────────────────────────┐ │
│              │  │                                         │ │
│              │  │           Editor Area                   │ │
│              │  │           (flex: 1, scroll)             │ │
│              │  │                                         │ │
│              │  └─────────────────────────────────────────┘ │
│              │                                               │
│              │  ┌─────────────────────────────────────────┐ │
│              │  │ Status Bar (32px)                       │ │
│              │  └─────────────────────────────────────────┘ │
├──────────────┴───────────────────────────────────────────────┤
│ (Resize handle)                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Components

### Title Bar

**Custom macOS-style title bar:**

```
┌──────────────────────────────────────────────────────────────┐
│ ● ● ●                    Nibandh              ☀️       ─ □ × │
└──────────────────────────────────────────────────────────────┘
  │         │                  │                 │         │
  │         │                  │                 │         └─ Window controls
  │         │                  │                 └─ Theme toggle
  │         │                  └─ App title (centered)
  │         └─ Traffic lights (native macOS)
  └─ Draggable region
```

**Specifications:**
- Height: 32px
- Background: `--bg-secondary`
- Traffic lights: Native macOS, positioned 12px from left
- Title: `--font-sans`, 13px, `--text-secondary`, centered
- Theme toggle: Icon button, 24px, right-aligned with 12px padding

### Sidebar

```
┌─────────────────┐
│ 🔍 Search...    │  ← Search input
├─────────────────┤
│                 │
│ ● Draft Title 1 │  ← Active draft (accent bg)
│ ○ Draft Title 2 │
│ ○ Draft Title 3 │
│                 │
├─────────────────┤
│ TAGS            │  ← Section header
│ ┌─────┐ ┌─────┐│
│ │ #AI │ │#Tech││  ← Tag chips
│ └─────┘ └─────┘│
│ ┌────────────┐ │
│ │ #Personal  │ │
│ └────────────┘ │
│                 │
├─────────────────┤
│ [+ New Draft]   │  ← Create button
└─────────────────┘
```

**Specifications:**

| Element | Specification |
|---------|---------------|
| Width | 240px (fixed) |
| Background | `--bg-secondary` |
| Search input | Full width, 36px height, `--radius-md` |
| Draft item | 40px height, 12px padding |
| Active draft | `--accent` background at 10% opacity, accent left border |
| Section header | 12px, `--text-muted`, uppercase, 8px top margin |
| Tag chip | `--bg-tertiary`, `--radius-full`, 8px padding |
| New draft button | Full width, accent color, 40px height |

### Draft List Item

```
┌─────────────────────────────────────────────┐
│ │ Draft Title That Might Be Long...         │
│ │ Jan 15 · #AI, #Tech                       │
└─────────────────────────────────────────────┘
  │
  └─ Active indicator (3px accent border-left)
```

**States:**
- Default: `--bg-secondary` background
- Hover: `--bg-tertiary` background
- Active: `--accent` at 10% + left border
- Focused: Outline ring

### Metadata Panel

**Collapsed state (default):**
```
┌────────────────────────────────────────────────────────────────┐
│ My Article Title                                          ▼   │
└────────────────────────────────────────────────────────────────┘
```

**Expanded state:**
```
┌────────────────────────────────────────────────────────────────┐
│ Title                                                     ▲   │
│ ┌────────────────────────────────────────────────────────────┐│
│ │ My Article Title                                           ││
│ └────────────────────────────────────────────────────────────┘│
│                                                                │
│ Tags                                                           │
│ ┌────────────────────────────────────────────────────────────┐│
│ │ ┌────┐ ┌──────┐ ┌───┐                                     ││
│ │ │ AI │ │ Tech │ │ + │                                     ││
│ │ └────┘ └──────┘ └───┘                                     ││
│ └────────────────────────────────────────────────────────────┘│
│                                                                │
│ Description                                                    │
│ ┌────────────────────────────────────────────────────────────┐│
│ │ A brief description for previews and SEO...                ││
│ └────────────────────────────────────────────────────────────┘│
│                                                                │
│ Cover Image                                                    │
│ ┌───────────────────────┐                                      │
│ │    📷 Drop or paste   │  or  [Choose File]                  │
│ │    cover image here   │                                      │
│ └───────────────────────┘                                      │
└────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Background: `--bg-primary` with bottom border
- Padding: 16px
- Field labels: 12px, `--text-muted`, 4px margin-bottom
- Inputs: 40px height, `--bg-secondary`, `--radius-md`
- Cover drop zone: 120px height, dashed border, center-aligned content

### Editor Area

**Empty state:**
```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                                                                │
│                                                                │
│                     Type / for commands...                     │
│                                                                │
│                                                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**With content:**
```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  # This is a Heading                                          │
│                                                                │
│  This is a paragraph with some **bold** and _italic_ text.    │
│  Here's a [link](url) to somewhere interesting.               │
│                                                                │
│  - Bullet point one                                           │
│  - Bullet point two                                           │
│  - Bullet point three                                         │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ```javascript                                            │ │
│  │ const hello = "world";                                   │ │
│  │ console.log(hello);                                      │ │
│  │ ```                                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Max content width: 720px (centered)
- Padding: 48px horizontal, 32px vertical
- Font: `--font-serif`, 17px, `--line-height: 1.7`
- Heading 1: 28px, bold, 32px margin-top
- Heading 2: 22px, bold, 24px margin-top
- Heading 3: 18px, semibold, 16px margin-top
- Paragraph: 12px margin-bottom
- Code block: `--bg-tertiary`, 16px padding, `--radius-md`

### Slash Command Menu

```
┌─────────────────────────────────────┐
│ 🔤 Heading 1          /h1           │ ← Selected (accent bg)
│ 🔤 Heading 2          /h2           │
│ 🔤 Heading 3          /h3           │
├─────────────────────────────────────┤
│ 📝 Paragraph          /p            │
│ 📋 Bullet List        /list         │
│ 🔢 Numbered List      /numbered     │
├─────────────────────────────────────┤
│ 💬 Quote              /quote        │
│ 💻 Code Block         /code         │
│ 🖼️ Image             /image        │
└─────────────────────────────────────┘
```

**Specifications:**
- Width: 280px
- Background: `--bg-primary`
- Shadow: `--shadow-lg`
- Border: 1px `--border`
- Border radius: `--radius-md`
- Item height: 36px
- Item padding: 12px horizontal
- Selected item: `--accent` at 10% opacity
- Icon: 16px, 8px right margin
- Shortcut: `--text-muted`, right-aligned, monospace

### Floating Toolbar

```
        ┌───────────────────────────────────────────┐
        │ B │ I │ S │ ─ │ 🔗 │ <> │ ─ │ 🎨 │        │
        └───────────────────────────────────────────┘
          │   │   │       │    │        │
          │   │   │       │    │        └─ Highlight color
          │   │   │       │    └─ Inline code
          │   │   │       └─ Link
          │   │   └─ Strikethrough
          │   └─ Italic
          └─ Bold
```

**Specifications:**
- Appears above selected text
- Background: `--bg-primary`
- Shadow: `--shadow-md`
- Border radius: `--radius-md`
- Button size: 32px × 32px
- Icon size: 16px
- Separator: 1px vertical line, `--border`
- Active button: `--accent` background at 15%

### Status Bar

```
┌────────────────────────────────────────────────────────────────┐
│ 1,234 words · 6 min read · ✓ Saved 2m ago    [Preview] [Pub]  │
└────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Height: 32px
- Background: `--bg-secondary`
- Border-top: 1px `--border`
- Font: 12px, `--text-secondary`
- Padding: 8px 16px
- Buttons: Right-aligned, `--radius-md`, 28px height

**Status indicators:**
- Saved: ✓ green checkmark
- Saving: ⟳ rotating sync icon
- Unsaved: ● orange dot
- Synced: ☁️ cloud icon
- Offline: ⚠️ warning icon

### Publish Dialog

```
┌──────────────────────────────────────────────────────────────────┐
│                        Ready to Publish                       × │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ARTICLE DETAILS                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Title: My Article Title                                         │
│  Slug:  my-article-title                              [Edit ✎]  │
│  Tags:  AI, Tech, Startups                                       │
│                                                                  │
│  CHANGES TO PUBLISH                                              │
│  ─────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ + content/articles/my-article-title.md                     │ │
│  │ + content/images/img_abc123.png                            │ │
│  │ + content/images/img_def456.png                            │ │
│  │ M site/public/images/ (2 files copied)                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  COMMIT MESSAGE                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Add: My Article Title                                      │ │
│  │                                                            │ │
│  │ Published via Nibandh                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                                                                  │
│                              [Cancel]    [Publish to Main →]    │
└──────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Width: 520px
- Background: `--bg-primary`
- Shadow: `--shadow-lg`
- Border radius: `--radius-lg`
- Header: 48px height, 18px font, centered
- Section titles: 11px, uppercase, `--text-muted`, 4px letter-spacing
- Changes box: `--bg-tertiary`, monospace font, max-height 120px, scroll
- Commit message: Textarea, 80px min-height
- Buttons: Primary (accent), Secondary (outline)

### Preview Modal

```
┌──────────────────────────────────────────────────────────────────┐
│ Preview                                   ☀️/🌙     [×]         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [Cover Image with gradient overlay]                        │ │
│  │                                                            │ │
│  │                    My Article Title                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  January 15, 2026 · AI, Tech                                    │
│                                                                  │
│  A brief description for previews and SEO. This is what        │
│  readers will see before clicking in.                           │
│  ───────────────────────────────────────────────────────────    │
│                                                                  │
│  # Introduction                                                  │
│                                                                  │
│  This is how the article will look on your actual site...      │
│                                                                  │
│  [Full article content rendered with site CSS]                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Full screen overlay with 40px padding
- Max content width: 680px (matches site)
- Background: `--bg-primary`
- Uses actual site CSS bundled in app
- Theme toggle independent of app theme
- Close button: Top-right corner, 40px × 40px

### Version History Panel

```
                                    ┌─────────────────────────────┐
                                    │ VERSION HISTORY          ← │
                                    ├─────────────────────────────┤
                                    │                             │
                                    │ ● Today, 2:30 PM           │
                                    │   1,234 words              │
                                    │   [Restore]                │
                                    │                             │
                                    │ ○ Today, 2:25 PM           │
                                    │   1,180 words (+54)        │
                                    │                             │
                                    │ ○ Today, 2:20 PM           │
                                    │   1,102 words              │
                                    │                             │
                                    │ ○ Yesterday, 11:45 PM      │
                                    │   892 words                │
                                    │                             │
                                    │ ○ Yesterday, 11:40 PM      │
                                    │   756 words                │
                                    │                             │
                                    └─────────────────────────────┘
```

**Specifications:**
- Width: 280px
- Slides in from right edge
- Background: `--bg-secondary`
- Shadow: `-10px 0 20px rgba(0,0,0,0.1)`
- Header: 48px, with back arrow
- Version item: 64px height, 12px padding
- Current version: Filled circle, `--accent`
- Past versions: Hollow circle, `--border`
- Word diff: `--text-muted`, shows +/- from previous

---

## Animations & Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Sidebar toggle | width, opacity | 200ms | ease-out |
| Modal open | opacity, transform (scale) | 150ms | ease-out |
| Modal close | opacity, transform | 100ms | ease-in |
| Dropdown open | opacity, transform (translateY) | 150ms | ease-out |
| Button hover | background-color | 100ms | linear |
| Theme switch | background, color | 200ms | ease-in-out |
| Version panel slide | transform (translateX) | 200ms | ease-out |
| Toolbar appear | opacity, transform | 100ms | ease-out |
| Save indicator | opacity | 300ms | ease-in-out |

---

## Responsive Behavior

| Breakpoint | Sidebar | Editor | Notes |
|------------|---------|--------|-------|
| < 900px | Hidden (toggle) | Full width | Minimum supported |
| 900-1200px | 200px | Remaining | Standard compact |
| > 1200px | 240px | 720px max + padding | Optimal experience |

---

## Accessibility

### Keyboard Navigation

| Action | Shortcut |
|--------|----------|
| Next section | `Tab` |
| Previous section | `Shift+Tab` |
| Navigate list | `↑` / `↓` |
| Select item | `Enter` |
| Close modal | `Escape` |
| Dismiss menu | `Escape` |

### Focus Indicators

- All interactive elements have visible focus ring
- Focus ring: 2px offset, accent color at 50% opacity
- Skip link available for screen readers

### Color Contrast

- All text meets WCAG AA minimum (4.5:1)
- Interactive elements meet 3:1 minimum
- Error states use both color and icon

### Screen Reader Support

- Semantic HTML structure
- ARIA labels for icon-only buttons
- Live regions for status updates
- Proper heading hierarchy

---

## Iconography

Using **Lucide** icon set (same as site):

| Icon | Name | Usage |
|------|------|-------|
| 🔍 | `Search` | Search input |
| ➕ | `Plus` | Add/create |
| ✓ | `Check` | Success, saved |
| ⚠️ | `AlertTriangle` | Warning |
| ❌ | `X` | Close, delete |
| ☀️ | `Sun` | Light theme |
| 🌙 | `Moon` | Dark theme |
| 📝 | `FileText` | Draft |
| 🖼️ | `Image` | Image block |
| 🔗 | `Link` | Link |
| 💻 | `Code` | Code block |
| 📤 | `Upload` | Publish |
| 👁️ | `Eye` | Preview |
| ⟳ | `RefreshCw` | Syncing |
| ☁️ | `Cloud` | Synced |
| ⏪ | `History` | Version history |

---

*End of UI/UX Specifications*
