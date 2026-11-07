import React, { useEffect, useRef, useState } from 'react';

const TAB_META: Record<string, { label: string; icon: string }> = {
  plan:     { label: 'Plan',     icon: '🗓️' },
  budget:   { label: 'Budget',   icon: '£' },
  research: { label: 'Research', icon: '🔍' },
  packing:  { label: 'Packing',  icon: '🎒' },
  charts:   { label: 'Charts',   icon: '📊' },
  posttrip: { label: 'Visited',  icon: '✓' },
  notes:    { label: 'Notes',    icon: '📝' },
  attire:   { label: 'Attire',   icon: '👔' },
  hauls:    { label: 'Hauls',    icon: '🛍️' },
};

interface MobileBottomTabsProps {
  tabs: string[];
  active: string;
  onChange: (key: string) => void;
}

export const MobileBottomTabs: React.FC<MobileBottomTabsProps> = ({ tabs, active, onChange }) => {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      if (y > lastY.current + 10 && y > 60) {
        setHidden(true);
      } else if (y < lastY.current - 8) {
        setHidden(false);
      }
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!tabs.length) return null;

  return (
    <nav
      className={`mobile-bottom-tabs ${hidden ? 'is-hidden' : ''}`}
      aria-label="Trip sections"
    >
      {tabs.map(key => {
        const meta = TAB_META[key] || { label: key, icon: '•' };
        return (
          <button
            key={key}
            type="button"
            className={`m-tab ${active === key ? 'active' : ''}`}
            onClick={() => onChange(key)}
          >
            <span className="m-icon" aria-hidden="true">{meta.icon}</span>
            <span>{meta.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
