import { useEffect, useState, useCallback, useRef } from 'react';
import { SerializedEditorState } from 'lexical';
import { invoke } from '@tauri-apps/api/core';
import { Toaster, toast } from 'sonner';
import { TitleBar } from './components/layout/TitleBar';
import { StatusBar } from './components/layout/StatusBar';
import { Sidebar } from './components/Sidebar';
import { MetadataPanel } from './components/editor/MetadataPanel';
import { Editor } from './components/blocks/editor-x/editor';
import { PublishDialog } from './components/PublishDialog';
import { PreviewDialog } from './components/PreviewDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { useDraftStore } from './stores/draftStore';
import { lexicalToMarkdown } from './lib/markdown';

// Import editor theme CSS
import './components/editor/themes/editor-theme.css';

function App() {
  const {
    draft,
    saveStatus,
    theme,
    repoPath,
    settingsLoaded,
    loadSettings,
    loadLatestDraft,
    loadDrafts,
    setContent,
    saveDraft,
    updateDraft,
  } = useDraftStore();

  const [showPublish, setShowPublish] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Ref for debounced save timeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings on startup
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Load drafts and latest draft on startup
  useEffect(() => {
    if (settingsLoaded) {
      loadDrafts();
      loadLatestDraft();
    }
  }, [settingsLoaded, loadDrafts, loadLatestDraft]);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Debounced auto-save when saveStatus changes to 'unsaved'
  useEffect(() => {
    if (saveStatus === 'unsaved') {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for 2 seconds
      saveTimeoutRef.current = setTimeout(() => {
        saveDraft();
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [saveStatus, saveDraft]);

  // Handle editor state changes
  const handleEditorChange = useCallback((editorState: SerializedEditorState) => {
    const textContent = extractTextFromEditorState(editorState);
    setContent(editorState, textContent);
  }, [setContent]);

  // State for sync loading
  const [isSyncing, setIsSyncing] = useState(false);

  // Handle sync button click - sync to drafts branch
  const handleSync = useCallback(async () => {
    if (!draft || !repoPath) {
      toast.error('Cannot sync', {
        description: !repoPath ? 'Please configure repository in Settings first' : 'No draft to sync',
      });
      return;
    }

    // Save the draft first if unsaved
    if (saveStatus === 'unsaved') {
      await saveDraft();
    }

    setIsSyncing(true);
    const toastId = toast.loading('Syncing to drafts branch...');

    try {
      // Generate slug from title
      const slug = draft.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'untitled';

      // Export content to markdown
      const markdownContent = draft.content ? lexicalToMarkdown(draft.content) : '';

      const result = await invoke<{ success: boolean; message: string; branch: string }>('sync_to_drafts', {
        args: {
          slug,
          title: draft.title || 'Untitled',
          date: draft.date || new Date().toISOString().split('T')[0],
          tags: draft.tags || [],
          description: draft.description || '',
          cover: draft.cover || '',
          coverPosition: draft.coverPosition ?? 50,
          updatedAt: draft.updatedAt,
          content: markdownContent,
          repoPath,
          draftId: draft.id || '',
        },
      });

      if (result.success) {
        toast.success('Synced to drafts branch', {
          id: toastId,
          description: result.message,
        });
        // Update draft status to 'synced'
        updateDraft({ status: 'synced', syncedAt: new Date().toISOString() });
        // Save the updated status
        saveDraft();
      } else {
        toast.error('Sync failed', {
          id: toastId,
          description: result.message,
        });
      }
    } catch (error) {
      toast.error('Sync failed', {
        id: toastId,
        description: String(error),
      });
    } finally {
      setIsSyncing(false);
    }
  }, [draft, repoPath, saveStatus, saveDraft, updateDraft]);

  return (
    <div className="h-screen flex bg-background text-foreground">
      {/* Sidebar - full height */}
      <Sidebar isOpen={showSidebar} onToggle={() => setShowSidebar(!showSidebar)} />

      {/* Main content column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Title Bar */}
        <TitleBar
          onOpenSettings={() => setShowSettings(true)}
          onOpenSidebar={() => setShowSidebar(true)}
          sidebarOpen={showSidebar}
        />

        {/* Editor Area */}
        <main className="flex-1 overflow-auto">
          {/* Page Header (Notion-style) */}
          <MetadataPanel />

          {/* Editor */}
          {draft && (
            <Editor
              editorSerializedState={draft.content}
              onSerializedChange={handleEditorChange}
            />
          )}
        </main>

        {/* Status Bar */}
        <StatusBar
          onPreview={() => setShowPreview(true)}
          onSync={handleSync}
          onPublish={() => setShowPublish(true)}
          isSyncing={isSyncing}
        />
      </div>

      {/* Preview Dialog */}
      <PreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
      />

      {/* Publish Dialog */}
      {showPublish && (
        <PublishDialog
          onClose={() => setShowPublish(false)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      {/* Toast notifications */}
      <Toaster theme={theme} richColors position="bottom-right" />
    </div>
  );
}

// Helper function to extract text from Lexical editor state
function extractTextFromEditorState(state: SerializedEditorState): string {
  try {
    const extractText = (node: any): string => {
      if (node.type === 'text') {
        return node.text || '';
      }
      if (node.children && Array.isArray(node.children)) {
        return node.children.map(extractText).join(' ');
      }
      return '';
    };
    return extractText(state.root).trim();
  } catch {
    return '';
  }
}

export default App;
