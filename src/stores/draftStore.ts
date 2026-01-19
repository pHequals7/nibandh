import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';

export type EditorWidth = 'narrow' | 'medium' | 'wide' | 'full';

interface Settings {
  repoPath: string;
  theme: string;
  editorWidth?: EditorWidth;
}

// Empty Lexical state for new drafts
const EMPTY_EDITOR_STATE: SerializedEditorState<SerializedLexicalNode> = {
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      } as SerializedLexicalNode,
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  } as SerializedLexicalNode,
} as SerializedEditorState<SerializedLexicalNode>;

// Draft status in the workflow
export type DraftStatus = 'draft' | 'synced' | 'published';

// Full draft structure (matches backend)
export interface Draft {
  id: string;
  slug: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
  cover: string;
  coverPosition: number;
  content: SerializedEditorState;
  textContent: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  publishedAt: string | null;
  status: DraftStatus;
}

// Draft for backend communication (content as JSON string)
interface DraftForBackend {
  id: string;
  slug: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
  cover: string;
  coverPosition: number;
  content: string; // JSON string
  textContent: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  publishedAt: string | null;
  status: DraftStatus;
}

// Summary for draft list
export interface DraftSummary {
  id: string;
  title: string;
  status: DraftStatus;
  updatedAt: string;
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

interface DraftStore {
  // State
  draft: Draft | null;
  drafts: DraftSummary[];
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  theme: 'light' | 'dark';
  repoPath: string;
  editorWidth: EditorWidth;
  settingsLoaded: boolean;
  draftsLoaded: boolean;

  // Actions
  setDraft: (draft: Draft) => void;
  updateDraft: (updates: Partial<Draft>) => void;
  setContent: (content: SerializedEditorState, textContent: string) => void;

  // Persistence actions
  saveDraft: () => Promise<void>;
  loadDrafts: () => Promise<void>;
  loadDraft: (id: string) => Promise<void>;
  loadLatestDraft: () => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  createNewDraft: () => void;

  // Settings actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setRepoPath: (path: string) => void;
  setEditorWidth: (width: EditorWidth) => void;
  loadSettings: () => Promise<void>;
}

export const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Convert frontend Draft to backend format
const draftToBackend = (draft: Draft): DraftForBackend => ({
  ...draft,
  content: JSON.stringify(draft.content),
  coverPosition: draft.coverPosition ?? 50,
});

// Convert backend draft to frontend format
const draftFromBackend = (data: DraftForBackend): Draft => ({
  ...data,
  content: typeof data.content === 'string'
    ? JSON.parse(data.content)
    : data.content,
  coverPosition: typeof data.coverPosition === 'number' ? data.coverPosition : 50,
});

export const useDraftStore = create<DraftStore>((set, get) => ({
  // Initial state
  draft: null,
  drafts: [],
  saveStatus: 'saved',
  lastSaved: null,
  theme: 'dark',
  repoPath: '',
  editorWidth: 'medium',
  settingsLoaded: false,
  draftsLoaded: false,

  // Actions
  setDraft: (draft) => set({ draft, saveStatus: 'saved' }),

  updateDraft: (updates) => set((state) => ({
    draft: state.draft
      ? { ...state.draft, ...updates, updatedAt: new Date().toISOString() }
      : null,
    saveStatus: 'unsaved',
  })),

  setContent: (content, textContent) => set((state) => ({
    draft: state.draft
      ? { ...state.draft, content, textContent, updatedAt: new Date().toISOString() }
      : null,
    saveStatus: 'unsaved',
  })),

  // Save current draft to SQLite
  saveDraft: async () => {
    const { draft } = get();
    if (!draft) return;

    set({ saveStatus: 'saving' });

    try {
      const backendDraft = draftToBackend(draft);
      const savedDraft = await invoke<DraftForBackend>('save_draft_to_db', { draft: backendDraft });
      const frontendDraft = draftFromBackend(savedDraft);

      set({
        draft: frontendDraft,
        saveStatus: 'saved',
        lastSaved: new Date()
      });

      // Refresh drafts list
      get().loadDrafts();
    } catch (error) {
      console.error('Failed to save draft:', error);
      set({ saveStatus: 'unsaved' });
    }
  },

  // Load all drafts list
  loadDrafts: async () => {
    try {
      const drafts = await invoke<DraftSummary[]>('list_drafts');
      set({ drafts, draftsLoaded: true });
    } catch (error) {
      console.error('Failed to load drafts:', error);
      set({ draftsLoaded: true });
    }
  },

  // Load a specific draft by ID
  loadDraft: async (id: string) => {
    try {
      const data = await invoke<DraftForBackend | null>('get_draft_from_db', { id });
      if (data) {
        const draft = draftFromBackend(data);
        set({ draft, saveStatus: 'saved' });
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  },

  // Load the most recent draft
  loadLatestDraft: async () => {
    try {
      const data = await invoke<DraftForBackend | null>('get_latest_draft');
      if (data) {
        const draft = draftFromBackend(data);
        set({ draft, saveStatus: 'saved' });
      } else {
        // No drafts exist, create a new one
        get().createNewDraft();
      }
    } catch (error) {
      console.error('Failed to load latest draft:', error);
      get().createNewDraft();
    }
  },

  // Delete a draft
  deleteDraft: async (id: string) => {
    try {
      await invoke<boolean>('delete_draft', { id });

      // If deleting current draft, load another or create new
      const { draft, drafts } = get();
      if (draft?.id === id) {
        const remaining = drafts.filter(d => d.id !== id);
        if (remaining.length > 0) {
          get().loadDraft(remaining[0].id);
        } else {
          get().createNewDraft();
        }
      }

      // Refresh list
      get().loadDrafts();
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  },

  createNewDraft: () => {
    const now = new Date().toISOString();
    const draft: Draft = {
      id: '', // Will be generated by backend on first save
      slug: '',
      title: '',
      date: now.split('T')[0],
      tags: [],
      description: '',
      cover: '',
      coverPosition: 50,
      content: EMPTY_EDITOR_STATE,
      textContent: '',
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      publishedAt: null,
      status: 'draft',
    };
    set({ draft, saveStatus: 'unsaved' });
  },

  setTheme: (theme) => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('light', newTheme === 'light');
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    set({ theme: newTheme });
  },

  setRepoPath: (path) => set({ repoPath: path }),

  setEditorWidth: (width) => set({ editorWidth: width }),

  loadSettings: async () => {
    try {
      const settings = await invoke<Settings>('get_settings');
      const theme = (settings.theme === 'light' ? 'light' : 'dark') as 'light' | 'dark';
      const editorWidth = (settings.editorWidth || 'medium') as EditorWidth;

      // Apply theme to document
      document.documentElement.classList.toggle('light', theme === 'light');
      document.documentElement.classList.toggle('dark', theme === 'dark');

      set({
        repoPath: settings.repoPath || '',
        theme,
        editorWidth,
        settingsLoaded: true,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ settingsLoaded: true });
    }
  },
}));
