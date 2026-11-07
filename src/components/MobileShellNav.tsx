import React, { useEffect, useRef, useState } from 'react';

interface MobileShellNavProps {
  active: 'trips' | 'charts' | 'settings';
  onTrips: () => void;
  onCharts: () => void;
  onNewTrip: () => void;
  onSettings: () => void;
}

export const MobileShellNav: React.FC<MobileShellNavProps> = ({
  active,
  onTrips,
  onCharts,
  onNewTrip,
  onSettings
}) => {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      if (y > lastY.current + 10 && y > 60) setHidden(true);
      else if (y < lastY.current - 8) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`mobile-shell-nav ${hidden ? 'is-hidden' : ''}`}
      aria-label="Main navigation"
    >
      <button
        type="button"
        className={`shell-tab ${active === 'trips' ? 'active' : ''}`}
        onClick={onTrips}
      >
        <span className="shell-icon" aria-hidden="true">🧳</span>
        <span>Trips</span>
      </button>
      <button
        type="button"
        className={`shell-tab ${active === 'charts' ? 'active' : ''}`}
        onClick={onCharts}
      >
        <span className="shell-icon" aria-hidden="true">📊</span>
        <span>Charts</span>
      </button>
      <button
        type="button"
        className="shell-tab shell-fab"
        onClick={onNewTrip}
        aria-label="New trip"
      >
        <span className="shell-fab-circle">+</span>
        <span>New</span>
      </button>
      <button
        type="button"
        className={`shell-tab ${active === 'settings' ? 'active' : ''}`}
        onClick={onSettings}
      >
        <span className="shell-icon" aria-hidden="true">⚙️</span>
        <span>Settings</span>
      </button>
    </nav>
  );
};
