export type MobileTab = 'canvas' | 'tools' | 'palette' | 'saved';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (_tab: MobileTab) => void;
  paletteTabLabel?: string;
  showPaletteBadge?: boolean;
}

const tabs: { id: MobileTab }[] = [
  { id: 'canvas' },
  { id: 'tools' },
  { id: 'palette' },
  { id: 'saved' },
];

const defaultLabels: Record<MobileTab, string> = {
  canvas: 'Canvas',
  tools: 'Tools',
  palette: 'Palette',
  saved: 'Saved',
};

export default function MobileTabBar({ activeTab, onTabChange, paletteTabLabel, showPaletteBadge }: MobileTabBarProps) {
  return (
    <nav className="bg-white border-t border-gray-100 flex safe-area-inset-bottom">
      {tabs.map((tab) => {
        const label = tab.id === 'palette' && paletteTabLabel
          ? paletteTabLabel
          : defaultLabels[tab.id];
        const hasBadge = tab.id === 'palette' && showPaletteBadge;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 flex items-center justify-center text-[11px] font-medium transition-colors ${
              activeTab === tab.id ? 'text-gray-800' : 'text-gray-400'
            }`}
          >
            <span className="relative inline-flex">
              {label}
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
