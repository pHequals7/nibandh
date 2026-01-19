import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, GitBranch, FileText, ImageIcon, Loader2 } from 'lucide-react';
import { useDraftStore, generateSlug } from '../stores/draftStore';
import { lexicalToMarkdown } from '../lib/markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface PublishDialogProps {
  onClose: () => void;
}

// Helper to count images in Lexical state
function countImagesInContent(content: any): number {
  let count = 0;
  const traverse = (node: any) => {
    if (node.type === 'image') {
      count++;
    }
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(traverse);
    }
  };
  if (content?.root) {
    traverse(content.root);
  }
  return count;
}

interface PublishDialogPropsExtended extends PublishDialogProps {
  onOpenSettings?: () => void;
}

export function PublishDialog({ onClose, onOpenSettings }: PublishDialogPropsExtended) {
  const { draft, updateDraft, repoPath } = useDraftStore();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState(
    draft?.title ? `Add: ${draft.title}` : 'Add new article'
  );

  if (!draft) return null;

  const slug = draft.slug || generateSlug(draft.title) || 'untitled';

  // Count images in content + cover
  const imageCount = countImagesInContent(draft.content) + (draft.cover ? 1 : 0);

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError(null);

    try {
      // Update draft with slug
      updateDraft({ slug, status: 'published', publishedAt: new Date().toISOString() });

      // Convert Lexical editor state to markdown
      const markdown = lexicalToMarkdown(draft.content);

      // Call Tauri command to publish
      const result = await invoke<{ success: boolean; message: string; file_path?: string }>('publish_draft', {
        args: {
          slug,
          title: draft.title,
          date: draft.date,
          tags: draft.tags,
          description: draft.description,
          cover: draft.cover || '',
          coverPosition: draft.coverPosition ?? 50,
          content: markdown,
          commitMessage,
          repoPath: repoPath,
        }
      });

      if (result.success) {
        toast.success('Published successfully!', {
          description: `Article saved to ${result.file_path?.split('/').pop() || slug + '.md'}`,
        });
        onClose();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Publish failed:', error);
      setPublishError(errorMessage);
      toast.error('Publish failed', {
        description: errorMessage,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Validation
  const hasRequiredFields = draft.title && draft.tags.length > 0 && draft.description;
  const hasRepoPath = Boolean(repoPath);
  const canPublish = hasRequiredFields && hasRepoPath;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ready to Publish</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Article Details */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Article Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Title</span>
                <span className="text-foreground font-medium truncate ml-4 max-w-[200px]">
                  {draft.title || 'Untitled'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Slug</span>
                <code className="px-2 py-0.5 bg-muted rounded text-xs text-primary font-mono">
                  {slug}.md
                </code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tags</span>
                <span className="text-foreground">
                  {draft.tags.join(', ') || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Changes */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Changes to Publish
            </h3>
            <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-green-500">
                <FileText size={13} strokeWidth={1.5} />
                <span>+ content/articles/{slug}.md</span>
              </div>
              {imageCount > 0 && (
                <div className="flex items-center gap-2 text-green-500">
                  <ImageIcon size={13} strokeWidth={1.5} />
                  <span>+ content/images/ ({imageCount} image{imageCount > 1 ? 's' : ''})</span>
                </div>
              )}
            </div>
          </div>

          {/* Commit Message */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Commit Message
            </h3>
            <Textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
              className="resize-none font-mono text-sm"
            />
          </div>

          {/* Repository not configured warning */}
          {!hasRepoPath && (
            <div className="text-xs text-orange-500 space-y-2 bg-orange-500/10 rounded-lg p-3">
              <p className="font-medium">Repository not configured</p>
              <p>You need to configure a Git repository path in Settings before you can publish.</p>
              {onOpenSettings && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="mt-1"
                >
                  Open Settings
                </Button>
              )}
            </div>
          )}

          {/* Validation warnings */}
          {hasRepoPath && !hasRequiredFields && (
            <div className="text-xs text-yellow-500 space-y-1 bg-yellow-500/10 rounded-lg p-3">
              {!draft.title && <p>• Missing required field: Title</p>}
              {draft.tags.length === 0 && <p>• Missing required field: Tags (at least one)</p>}
              {!draft.description && <p>• Missing required field: Description</p>}
            </div>
          )}

          {/* Error display */}
          {publishError && (
            <div className="text-xs text-red-500 space-y-1 bg-red-500/10 rounded-lg p-3">
              <p className="font-medium">Publish Error:</p>
              <p className="break-all">{publishError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!canPublish || isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <GitBranch size={14} strokeWidth={2} className="mr-2" />
                Publish to Main
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
