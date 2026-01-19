import { useEffect } from 'react';
import { Plus, FileText, Cloud, CheckCircle, Trash2, PanelLeftClose } from 'lucide-react';
import { useDraftStore, DraftSummary, DraftStatus } from '../stores/draftStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onToggle?: () => void;
}

function StatusBadge({ status }: { status: DraftStatus }) {
  switch (status) {
    case 'synced':
      return (
        <span className="flex items-center gap-1 text-blue-500" title="Synced to drafts branch">
          <Cloud size={10} />
        </span>
      );
    case 'published':
      return (
        <span className="flex items-center gap-1 text-green-500" title="Published">
          <CheckCircle size={10} />
        </span>
      );
    default:
      return null;
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const {
    draft,
    drafts,
    draftsLoaded,
    saveStatus,
    loadDrafts,
    loadDraft,
    createNewDraft,
    deleteDraft,
    saveDraft,
  } = useDraftStore();

  // Load drafts list on mount
  useEffect(() => {
    if (!draftsLoaded) {
      loadDrafts();
    }
  }, [draftsLoaded, loadDrafts]);

  const handleNewDraft = async () => {
    // Save current draft if unsaved
    if (saveStatus === 'unsaved') {
      await saveDraft();
    }
    createNewDraft();
  };

  const handleSelectDraft = async (id: string) => {
    if (id === draft?.id) return;

    // Save current draft if unsaved
    if (saveStatus === 'unsaved') {
      await saveDraft();
    }
    loadDraft(id);
  };

  const handleDeleteDraft = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this draft? This cannot be undone.')) {
      deleteDraft(id);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-52 h-full bg-card border-r flex flex-col">
      {/* Header - traffic light spacer + buttons at right edge */}
      <div className="flex pt-2 px-2">
        {/* macOS traffic lights spacer */}
        <div className="w-16 h-8" />
        {/* Spacer to push buttons right */}
        <div className="flex-1" />
        {/* Buttons stacked vertically */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggle}
            title="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mt-1"
            onClick={handleNewDraft}
            title="New draft"
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>
      {/* Drafts label */}
      <div className="px-3 py-2 border-b">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Drafts</h2>
      </div>

      {/* Draft List */}
      <div className="flex-1 overflow-auto">
        {drafts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No drafts yet.
            <br />
            <button
              onClick={handleNewDraft}
              className="text-primary underline-offset-4 hover:underline mt-1"
            >
              Create your first draft
            </button>
          </div>
        ) : (
          <ul className="py-1">
            {drafts.map((d) => (
              <li key={d.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectDraft(d.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectDraft(d.id)}
                  className={cn(
                    'w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-accent/50 transition-colors group cursor-pointer rounded-r-lg',
                    draft?.id === d.id && 'bg-accent/10 border-l-[3px] border-accent'
                  )}
                >
                  <FileText
                    size={14}
                    className="mt-0.5 flex-shrink-0 text-muted-foreground"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm truncate">
                        {d.title || 'Untitled'}
                      </span>
                      <StatusBadge status={d.status} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(d.updatedAt)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDraft(e, d.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                    title="Delete draft"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Current draft indicator */}
      {draft && !draft.id && (
        <div className="p-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText size={12} />
            <span>New unsaved draft</span>
          </div>
        </div>
      )}
    </aside>
  );
}
