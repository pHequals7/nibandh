import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useDraftStore } from '@/stores/draftStore';
import { lexicalToMarkdown } from '@/lib/markdown';

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreviewDialog({ open, onOpenChange }: PreviewDialogProps) {
  const { draft, repoPath } = useDraftStore();

  if (!draft) {
    return null;
  }

  const markdown = draft.content ? lexicalToMarkdown(draft.content) : '';
  const dateText = draft.date
    ? new Date(draft.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  const tagsText = draft.tags?.length ? draft.tags.join(', ') : '';

  const resolveImageSrc = (src?: string) => {
    if (!src) return '';
    if (src.startsWith('data:')) return src;
    if (src.startsWith('http://') || src.startsWith('https://')) return src;

    if (!repoPath) return src;

    if (src.startsWith('../images/')) {
      return convertFileSrc(`${repoPath}/content/images/${src.replace('../images/', '')}`);
    }

    if (src.startsWith('/images/')) {
      return convertFileSrc(`${repoPath}/content/images/${src.replace('/images/', '')}`);
    }

    if (src.startsWith('/drafts/images/')) {
      return convertFileSrc(`${repoPath}${src}`);
    }

    return src;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="preview-dialog bg-transparent border-none shadow-none p-0 max-w-[1280px]"
        showCloseButton={false}
      >
        <div className="preview-surface rounded-2xl border border-border/30 overflow-hidden">
          <div className="preview-toolbar">
            <div className="preview-title">Preview</div>
            <button
              className="preview-close"
              onClick={() => onOpenChange(false)}
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>

          <div className="preview-scroll">
            <div className="preview-inner">
              {draft.cover ? (
                <div className="preview-hero">
                  <img
                    src={draft.cover}
                    alt="Cover"
                    style={{ objectPosition: `50% ${draft.coverPosition ?? 50}%` }}
                  />
                  <div className="preview-hero-overlay" />
                  <div className="preview-hero-title">{draft.title || 'Untitled'}</div>
                </div>
              ) : (
                <h1 className="preview-h1">{draft.title || 'Untitled'}</h1>
              )}

              <div className="preview-meta">
                {dateText && <span>{dateText}</span>}
                {dateText && tagsText && <span>·</span>}
                {tagsText && <span>{tagsText}</span>}
              </div>

              {draft.description && (
                <p className="preview-description">{draft.description}</p>
              )}

              <div className="preview-divider" />

              <article className="preview-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  urlTransform={resolveImageSrc}
                  components={{
                    img: ({ src, alt }) => (
                      <img src={resolveImageSrc(src)} alt={alt || ''} loading="lazy" />
                    ),
                  }}
                >
                  {markdown}
                </ReactMarkdown>
              </article>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
