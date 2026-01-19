import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { FolderOpen, Check, X, Sun, Moon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDraftStore, EditorWidth } from '../stores/draftStore';

interface RepoValidation {
  isValid: boolean;
  isGitRepo: boolean;
  hasContentDir: boolean;
  error: string | null;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme, repoPath, setRepoPath, editorWidth, setEditorWidth } = useDraftStore();

  const [localRepoPath, setLocalRepoPath] = useState(repoPath);
  const [localTheme, setLocalTheme] = useState(theme);
  const [localEditorWidth, setLocalEditorWidth] = useState<EditorWidth>(editorWidth);
  const [validation, setValidation] = useState<RepoValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalRepoPath(repoPath);
      setLocalTheme(theme);
      setLocalEditorWidth(editorWidth);
      if (repoPath) {
        validatePath(repoPath);
      }
    }
  }, [open, repoPath, theme, editorWidth]);

  const validatePath = async (path: string) => {
    if (!path) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    try {
      const result = await invoke<RepoValidation>('validate_repo_path', { path });
      setValidation(result);
    } catch (error) {
      setValidation({
        isValid: false,
        isGitRepo: false,
        hasContentDir: false,
        error: String(error),
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleBrowse = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'Select your blog repository',
      });

      if (selected && typeof selected === 'string') {
        setLocalRepoPath(selected);
        validatePath(selected);
      }
    } catch (error) {
      console.error('Failed to open folder picker:', error);
    }
  };

  const handlePathChange = (value: string) => {
    setLocalRepoPath(value);
    // Debounce validation
    const timeoutId = setTimeout(() => validatePath(value), 500);
    return () => clearTimeout(timeoutId);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to Tauri backend
      await invoke('save_settings', {
        settings: {
          repoPath: localRepoPath,
          theme: localTheme,
          editorWidth: localEditorWidth,
        },
      });

      // Update Zustand store
      setRepoPath(localRepoPath);
      setTheme(localTheme);
      setEditorWidth(localEditorWidth);

      // Show success toast
      toast.success('Settings saved', {
        description: localRepoPath
          ? `Repository: ${localRepoPath.split('/').pop()}`
          : 'Your preferences have been updated.',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings', {
        description: String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = !isValidating && (!localRepoPath || validation?.isValid);
  const selectedThemeStyle =
    localTheme === 'light'
      ? { backgroundColor: '#e4e4e7', color: '#18181b', borderColor: '#e4e4e7' }
      : { backgroundColor: '#27272a', color: '#f4f4f5', borderColor: '#3f3f46' };
  const selectedWidthStyle = {
    backgroundColor: '#3f3f46',
    color: '#f4f4f5',
    borderColor: '#3f3f46',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your Nibandh writing environment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Repository Path */}
          <div className="space-y-2">
            <Label htmlFor="repoPath">Repository Path</Label>
            <p className="text-xs text-muted-foreground">
              Select the root of your blog's git repository.
            </p>
            <div className="flex gap-2">
              <Input
                id="repoPath"
                value={localRepoPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="/path/to/your/blog-repo"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleBrowse}
                title="Browse for folder"
              >
                <FolderOpen size={16} />
              </Button>
            </div>

            {/* Validation Status */}
            {localRepoPath && (
              <div className="flex items-center gap-2 text-sm mt-2">
                {isValidating ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Validating...</span>
                  </>
                ) : validation?.isValid ? (
                  <>
                    <Check size={14} className="text-green-500" />
                    <span className="text-green-500">Valid git repository</span>
                    {!validation.hasContentDir && (
                      <span className="text-muted-foreground">
                        (content/ directory will be created)
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <X size={14} className="text-red-500" />
                    <span className="text-red-500">
                      {validation?.error || 'Invalid repository'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={localTheme === 'light' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setLocalTheme('light')}
                style={localTheme === 'light' ? selectedThemeStyle : undefined}
              >
                <Sun size={16} className="mr-2" />
                Light
              </Button>
              <Button
                variant={localTheme === 'dark' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setLocalTheme('dark')}
                style={localTheme === 'dark' ? selectedThemeStyle : undefined}
              >
                <Moon size={16} className="mr-2" />
                Dark
              </Button>
            </div>
          </div>

          {/* Editor Width */}
          <div className="space-y-2">
            <Label>Editor Width</Label>
            <p className="text-xs text-muted-foreground">
              Control the width of the writing area.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['narrow', 'medium', 'wide', 'full'] as EditorWidth[]).map((width) => (
                <Button
                  key={width}
                  variant={localEditorWidth === width ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocalEditorWidth(width)}
                  className="capitalize"
                  style={localEditorWidth === width ? selectedWidthStyle : undefined}
                >
                  {width}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            style={{
              backgroundColor: '#e4e4e7',
              color: '#18181b',
              opacity: (!canSave || isSaving) ? 0.6 : 1
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
