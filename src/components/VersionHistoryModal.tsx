import React, { useState, useMemo } from 'react';
import { APP_VERSION, CHANGELOG } from '../types';
import {
  Compass,
  X,
  Award,
  Search,
  Sparkles,
  CheckCircle,
  Wrench,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const allVersions = useMemo(() => {
    return Object.keys(CHANGELOG).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true })
    );
  }, []);

  const filteredVersions = useMemo(() => {
    if (!searchTerm.trim()) return allVersions;
    const term = searchTerm.toLowerCase();
    return allVersions.filter(ver => {
      const notes = CHANGELOG[ver] || '';
      return ver.toLowerCase().includes(term) || notes.toLowerCase().includes(term);
    });
  }, [allVersions, searchTerm]);

  if (!isOpen) return null;

  // Helper to parse unstructured changelog sentences into bulleted entries
  const parseChangelogItems = (text: string) => {
    if (!text) return [];
    // Split sentences or already delineated points
    const rawSentences = text
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/g)
      .map(s => s.trim())
      .filter(Boolean);

    return rawSentences.map((sentence, idx) => {
      const lower = sentence.toLowerCase();
      let type: 'feature' | 'fix' | 'improvement' = 'improvement';
      let icon = '✦';

      if (lower.startsWith('added') || lower.startsWith('introduced') || lower.includes('feature')) {
        type = 'feature';
        icon = '✨';
      } else if (lower.startsWith('fixed') || lower.startsWith('resolved') || lower.includes('bug') || lower.includes('error')) {
        type = 'fix';
        icon = '🛠️';
      }

      return {
        id: idx,
        type,
        icon,
        text: sentence
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-[#fcfaf5] border-2 border-[#1c2530] rounded-xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#1c2530] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1c2530] text-[#f4efe2] flex items-center justify-center font-bold">
              <Compass size={18} className="text-[#b8874f]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-serif font-black text-[#1c2530] tracking-tight">
                Trip Planner Version History
              </h3>
              <p className="text-[11px] font-mono uppercase tracking-[2px] text-[#8a7a3a] mt-0.5 font-semibold">
                Release Annals &amp; Changelog Dispatches
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#5b6672] hover:text-[#1c2530] hover:bg-[#eae4d3] rounded-md transition-colors cursor-pointer"
            title="Close release history"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Release Highlight Banner */}
        <div className="relative overflow-hidden bg-[#f4efe2] border border-[#b8874f] rounded-lg p-3.5 mb-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#8a7a3a] font-bold">
                  Active Build
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#35695c] text-white rounded">
                  Current
                </span>
              </div>
              <div className="text-xl font-serif font-black text-[#1c2530] mt-0.5 flex items-center gap-2">
                <span>Release v{APP_VERSION}</span>
              </div>
              <p className="text-xs text-[#5b6672] mt-0.5 font-mono">
                Running in production on Google Cloud with persistent Firestore database
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="text-right hidden sm:block font-mono text-[11px] text-[#5b6672]">
                <div>{allVersions.length} Releases</div>
                <div className="text-[#35695c] font-semibold">Up to Date</div>
              </div>
              <Award size={32} className="text-[#b8874f]" />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="relative mb-3.5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7a3a]" />
          <input
            type="text"
            placeholder="Search changes by keyword (e.g. maps, archive, currency, sync)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-mono bg-[#f4efe2] border border-[#d5cbac] focus:border-[#b8874f] rounded-md text-[#1c2530] placeholder-[#5b6672] outline-none transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#5b6672] hover:text-[#1c2530]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Version List Timeline */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1 scrollbar-thin">
          {filteredVersions.length === 0 ? (
            <div className="text-center py-12 text-[#5b6672] font-mono text-xs">
              No releases match "{searchTerm}". Try a different search term.
            </div>
          ) : (
            filteredVersions.map((ver, idx) => {
              const isCurrent = ver === APP_VERSION;
              const items = parseChangelogItems(CHANGELOG[ver]);

              return (
                <div
                  key={ver}
                  className={`rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-[#fcfaf5] border-[#b8874f] shadow-xs'
                      : 'bg-[#f4efe2]/60 border-[#d5cbac] hover:border-[#b8874f]/70'
                  }`}
                >
                  {/* Version Item Header */}
                  <div className="px-4 py-2.5 border-b border-[#e2d8bd] bg-[#f4efe2] flex items-center justify-between rounded-t-lg">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-[#1c2530] tracking-tight">
                        v{ver}
                      </span>
                      {isCurrent ? (
                        <span className="px-2 py-0.5 text-[9.5px] font-mono font-bold uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded">
                          Current
                        </span>
                      ) : idx === 1 ? (
                        <span className="px-2 py-0.5 text-[9.5px] font-mono font-bold uppercase tracking-wider bg-[#eae4d3] border border-[#c7bb98] text-[#5b6672] rounded">
                          Previous
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10.5px] font-mono text-[#8a7a3a] font-semibold">
                      {items.length} update{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Bulleted Points */}
                  <div className="p-3.5 space-y-2">
                    {items.map(item => (
                      <div key={item.id} className="flex items-start gap-2.5 text-xs leading-relaxed">
                        <span className="mt-0.5 text-xs select-none flex-shrink-0" title={item.type}>
                          {item.icon}
                        </span>
                        <div className="flex-1 text-[#37455a] font-normal">
                          {item.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-[#d5cbac] mt-4 flex items-center justify-between">
          <div className="text-[11px] font-mono text-[#5b6672]">
            Showing {filteredVersions.length} of {allVersions.length} release entries
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded-md hover:bg-[#37455a] font-bold transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
