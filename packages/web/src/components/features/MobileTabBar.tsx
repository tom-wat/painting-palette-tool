export type MobileTab = 'canvas' | 'tools' | 'palette' | 'annotate' | 'saved';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (_tab: MobileTab) => void;
  isAnnotateMode?: boolean;
  showPaletteBadge?: boolean;
}

const labels: Record<MobileTab, string> = {
  canvas: 'Canvas',
  tools: 'Tools',
  palette: 'Palette',
  annotate: 'Annotate',
  saved: 'Saved',
};

export default function MobileTabBar({ activeTab, onTabChange, isAnnotateMode, showPaletteBadge }: MobileTabBarProps) {
  // Palette and Annotate swap based on mode
  const middleTab: MobileTab = isAnnotateMode ? 'annotate' : 'palette';
  const tabs: MobileTab[] = ['canvas', 'tools', middleTab, 'saved'];

  return (
    <nav className="bg-white border-t border-gray-100 flex safe-area-inset-bottom">
      {tabs.map((tab) => {
        const hasBadge = tab === 'palette' && showPaletteBadge;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 py-3 flex items-center justify-center text-[11px] font-medium transition-colors ${
              activeTab === tab ? 'text-gray-800' : 'text-gray-400'
            }`}
          >
            <span className="relative inline-flex">
              {labels[tab]}
              {hasBadge && (
                <span className="absolute -top-1 -right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
