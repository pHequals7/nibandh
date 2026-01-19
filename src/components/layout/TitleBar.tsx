import { Sun, Moon, Settings, PanelLeft } from 'lucide-react';
import { useDraftStore } from '../../stores/draftStore';
import { Button } from '@/components/ui/button';

interface TitleBarProps {
  onOpenSettings?: () => void;
  onOpenSidebar?: () => void;
  sidebarOpen?: boolean;
}

export function TitleBar({ onOpenSettings, onOpenSidebar, sidebarOpen }: TitleBarProps) {
  const { theme, toggleTheme } = useDraftStore();

  return (
    <header
      data-tauri-drag-region
      className="h-12 flex items-center justify-between px-4 bg-card border-b select-none"
    >
      {/* Left: Open sidebar button when collapsed */}
      <div className="flex items-center">
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenSidebar}
            title="Open sidebar"
          >
            <PanelLeft size={16} strokeWidth={1.5} />
          </Button>
        )}
      </div>

      {/* Center: App title - subtle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground tracking-wide">
          Nibandh
        </span>
      </div>

      {/* Right: Settings & Theme toggle */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-accent/50 rounded-lg"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={16} strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-accent/50 rounded-lg"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun size={16} strokeWidth={1.5} />
          ) : (
            <Moon size={16} strokeWidth={1.5} />
          )}
        </Button>
      </div>
    </header>
  );
}
