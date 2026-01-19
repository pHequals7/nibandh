import { useMemo } from 'react';
import { Check, Circle, Eye, GitBranch, Upload, Loader2 } from 'lucide-react';
import { useDraftStore } from '../../stores/draftStore';
import { Button } from '@/components/ui/button';

interface StatusBarProps {
  onPreview?: () => void;
  onPublish?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function StatusBar({ onPreview, onPublish, onSync, isSyncing }: StatusBarProps) {
  const { draft, saveStatus, lastSaved, repoPath } = useDraftStore();

  const stats = useMemo(() => {
    if (!draft?.textContent) {
      return { words: 0, readingTime: 0 };
    }

    // Count words from plain text content
    const text = draft.textContent.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    return { words, readingTime };
  }, [draft?.textContent]);

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const diff = Date.now() - lastSaved.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1m ago';
    return `${minutes}m ago`;
  };

  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <>
            <Loader2 size={10} className="animate-spin text-muted-foreground" />
            <span>Saving...</span>
          </>
        );
      case 'unsaved':
        return (
          <>
            <Circle size={6} className="fill-yellow-500 text-yellow-500" />
            <span>Unsaved</span>
          </>
        );
      case 'saved':
        return lastSaved ? (
          <>
            <Check size={11} strokeWidth={2.5} className="text-green-500" />
            <span>Saved {formatLastSaved()}</span>
          </>
        ) : null;
      default:
        return null;
    }
  };

  // Can sync if draft is saved and has an ID (persisted at least once)
  const canSync = saveStatus === 'saved' && draft?.id && repoPath;

  return (
    <footer className="h-8 flex items-center justify-between px-4 bg-card border-t text-xs select-none">
      {/* Left: Stats */}
      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="opacity-60">{stats.words.toLocaleString()} words</span>
        <span className="opacity-40">·</span>
        <span className="opacity-60">{stats.readingTime} min read</span>

        {/* Save status */}
        {(saveStatus !== 'saved' || lastSaved) && (
          <>
            <span className="opacity-50">·</span>
            <span className="flex items-center gap-1.5">
              {renderSaveStatus()}
            </span>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={onPreview}
        >
          <Eye size={13} strokeWidth={1.5} className="mr-1" />
          Preview
        </Button>

        <div className="h-4 w-px bg-border" /> {/* Separator */}

        <Button
          variant="outline"
          size="sm"
          className="h-6 px-3 text-xs"
          onClick={onSync}
          disabled={!canSync || isSyncing}
          title={!repoPath ? 'Configure repository in Settings first' : 'Push to drafts branch for backup/sync'}
          style={{
            borderColor: '#3f3f46',
            backgroundColor: 'transparent',
            color: (!canSync || isSyncing) ? 'rgba(161, 161, 170, 0.5)' : '#a1a1aa',
          }}
        >
          {isSyncing ? (
            <Loader2 size={13} strokeWidth={1.5} className="mr-1.5 animate-spin" />
          ) : (
            <GitBranch size={13} strokeWidth={1.5} className="mr-1.5" />
          )}
          {isSyncing ? 'Syncing...' : 'Sync to Drafts'}
        </Button>

        <Button
          variant="success"
          size="sm"
          className="h-6 px-3 text-xs"
          onClick={onPublish}
          disabled={!draft?.title || !repoPath}
          title={!repoPath ? 'Configure repository in Settings first' : 'Commit and push to main branch'}
          style={{
            backgroundColor: (!draft?.title || !repoPath) ? 'rgba(22, 163, 74, 0.7)' : '#16a34a',
            color: 'white',
          }}
        >
          <Upload size={13} strokeWidth={2} className="mr-1.5" />
          Publish to Main
        </Button>
      </div>
    </footer>
  );
}
