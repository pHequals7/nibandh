import { useState, useRef, useEffect } from 'react';
import { X, Plus, ImageIcon, Calendar, Tag } from 'lucide-react';
import { useDraftStore, EditorWidth } from '../../stores/draftStore';

const WIDTH_CLASSES: Record<EditorWidth, string> = {
  narrow: 'max-w-2xl',
  medium: 'max-w-3xl',
  wide: 'max-w-4xl',
  full: 'max-w-5xl',
};

export function MetadataPanel() {
  const { draft, updateDraft, editorWidth } = useDraftStore();
  const [tagInput, setTagInput] = useState('');
  const widthClass = WIDTH_CLASSES[editorWidth];
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [showCoverLinkInput, setShowCoverLinkInput] = useState(false);
  const [coverLinkValue, setCoverLinkValue] = useState('');
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);

  // Auto-resize title textarea - must be before any early return
  useEffect(() => {
    if (titleRef.current && draft) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [draft?.title]);

  if (!draft) return null;

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !draft.tags.includes(tag)) {
      updateDraft({ tags: [...draft.tags, tag] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateDraft({ tags: draft.tags.filter((t) => t !== tagToRemove) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleCoverUpload = async (file: File) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCoverDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = await handleCoverUpload(file);
      updateDraft({ cover: url });
    }
  };

  const handleCoverPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const url = await handleCoverUpload(file);
          updateDraft({ cover: url });
        }
        break;
      }
    }
  };

  const formattedDate = new Date(draft.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const createdDateText = draft.createdAt
    ? new Date(draft.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  const updatedDateText = draft.updatedAt
    ? new Date(draft.updatedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const applyCoverPosition = (clientY: number) => {
    if (!coverRef.current) return;
    const rect = coverRef.current.getBoundingClientRect();
    if (rect.height <= 0) return;
    const raw = ((clientY - rect.top) / rect.height) * 100;
    const clamped = Math.max(0, Math.min(100, raw));
    updateDraft({ coverPosition: Math.round(clamped) });
  };

  const handleCoverPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isRepositioning) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsDraggingCover(true);
    applyCoverPosition(event.clientY);
  };

  const handleCoverPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isRepositioning || !isDraggingCover) return;
    event.preventDefault();
    applyCoverPosition(event.clientY);
  };

  const handleCoverPointerUp = () => {
    setIsDraggingCover(false);
  };

  const openCoverFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = await handleCoverUpload(file);
        updateDraft({ cover: url });
      }
    };
    input.click();
  };

  const openCoverLinkInput = () => {
    setCoverLinkValue('');
    setShowCoverLinkInput(true);
  };

  const applyCoverLink = () => {
    const url = coverLinkValue.trim();
    if (url) {
      updateDraft({ cover: url });
      setShowCoverLinkInput(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Cover Image */}
      {draft.cover ? (
        <div
          ref={coverRef}
          className={`relative h-60 w-full group ${isRepositioning ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onPointerDown={handleCoverPointerDown}
          onPointerMove={handleCoverPointerMove}
          onPointerUp={handleCoverPointerUp}
        >
          <img
            src={draft.cover}
            alt="Cover"
            className="w-full h-full object-cover"
            style={{ objectPosition: `50% ${draft.coverPosition ?? 50}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={openCoverFilePicker}
              className="px-2.5 py-1 rounded-md text-xs bg-black/60 text-white hover:bg-black/70 backdrop-blur border border-white/10 shadow-sm"
            >
              Change cover
            </button>
            <button
              onClick={openCoverLinkInput}
              className="px-2.5 py-1 rounded-md text-xs bg-black/60 text-white hover:bg-black/70 backdrop-blur border border-white/10 shadow-sm"
            >
              Insert link
            </button>
            <button
              onClick={() => setIsRepositioning((prev) => !prev)}
              className="px-2.5 py-1 rounded-md text-xs border shadow-sm"
              style={
                isRepositioning
                  ? { backgroundColor: '#f4f4f5', color: '#09090b', borderColor: '#f4f4f5' }
                  : { backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.1)' }
              }
            >
              {isRepositioning ? 'Done' : 'Reposition'}
            </button>
            <button
              onClick={() => updateDraft({ cover: '' })}
              className="p-1.5 rounded-md bg-black/60 text-white/80 hover:text-white backdrop-blur border border-white/10 shadow-sm"
            >
              <X size={14} />
            </button>
          </div>
          {isRepositioning && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-background/90 pointer-events-none">
              Drag to reposition
            </div>
          )}
          {showCoverLinkInput && (
            <div className="absolute top-12 right-3 w-72 rounded-md border border-border bg-background/95 p-2 shadow-sm">
              <div className="text-[11px] text-muted-foreground mb-1">Image URL</div>
              <input
                type="url"
                value={coverLinkValue}
                onChange={(e) => setCoverLinkValue(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs text-foreground outline-none"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCoverLinkInput(false)}
                >
                  Cancel
                </button>
                <button
                  className="text-xs rounded-md px-2 py-1"
                  style={{ backgroundColor: '#18181b', color: '#fafafa' }}
                  onClick={applyCoverLink}
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-28 w-full border-b border-border/40">
          <div
            onDrop={handleCoverDrop}
            onDragOver={(e) => e.preventDefault()}
            onPaste={handleCoverPaste}
            className="flex items-center gap-2 relative"
          >
            <button
              onClick={openCoverFilePicker}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <ImageIcon size={14} />
              <span>Add cover</span>
            </button>
            <button
              onClick={openCoverLinkInput}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus size={14} />
              <span>Insert link</span>
            </button>
            {showCoverLinkInput && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 rounded-md border border-border bg-background/95 p-2 shadow-sm">
                <div className="text-[11px] text-muted-foreground mb-1">Image URL</div>
                <input
                  type="url"
                  value={coverLinkValue}
                  onChange={(e) => setCoverLinkValue(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs text-foreground outline-none"
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCoverLinkInput(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="text-xs rounded-md px-2 py-1"
                    style={{ backgroundColor: '#18181b', color: '#fafafa' }}
                    onClick={applyCoverLink}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Header Content */}
      <div className={`${widthClass} mx-auto px-12 py-8 transition-all duration-200`}>
        {/* Title - Large, editable */}
        <textarea
          ref={titleRef}
          value={draft.title}
          onChange={(e) => updateDraft({ title: e.target.value })}
          placeholder="Untitled"
          rows={1}
          className="w-full text-4xl font-bold bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50 text-foreground leading-[1.1] py-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
        />

        {/* Metadata Row */}
        <div className="mt-4 space-y-4">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar size={14} className="opacity-50" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {createdDateText && <span>Created {createdDateText}</span>}
            {updatedDateText && <span>Edited {updatedDateText}</span>}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 text-sm">
            <Tag size={14} className="text-muted-foreground opacity-50" />
            <div className="flex flex-wrap items-center gap-1.5">
              {draft.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-md text-xs text-muted-foreground hover:text-foreground group"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleAddTag}
                placeholder={draft.tags.length === 0 ? 'Add tags...' : '+'}
                className="w-16 px-1 py-0.5 bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Description (subtle) */}
          <div className="pt-2">
            <textarea
              value={draft.description}
              onChange={(e) => updateDraft({ description: e.target.value })}
              placeholder="Add a description..."
              rows={1}
              className="w-full text-sm bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/40 text-muted-foreground leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
