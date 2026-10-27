import React from 'react';
import { APP_VERSION, CHANGELOG } from '../types';
import { History, X, Check, Award, Compass } from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const versions = Object.keys(CHANGELOG);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-[#fcfaf5] border-2 border-[#1c2530] rounded-lg max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#d5cbac] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Compass size={18} className="text-[#b8874f]" />
            <h3 className="text-lg font-serif font-bold text-[#1c2530]">
              Travel Ledger Version History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#5b6672] hover:text-[#1c2530] hover:bg-[#eae4d3] rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between bg-[#f4efe2] border border-[#d5cbac] rounded-md p-3 mb-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672]">Current Release</div>
            <div className="text-base font-serif font-bold text-[#1c2530] flex items-center gap-2 mt-0.5">
              <span>v{APP_VERSION}</span>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold bg-[#35695c] text-white rounded">
                Active
              </span>
            </div>
          </div>
          <Award size={28} className="text-[#b8874f]" />
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {versions.map((ver, idx) => (
            <div
              key={ver}
              className={`p-3 rounded-md border ${
                idx === 0
                  ? 'bg-[#f4efe2] border-[#b8874f]'
                  : 'bg-[#fcfaf5] border-[#e2d8bd]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-[#1c2530]">v{ver}</span>
                {idx === 0 && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#b8874f] font-bold">
                    Latest
                  </span>
                )}
              </div>
              <p className="text-xs text-[#37455a] leading-relaxed">{CHANGELOG[ver]}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-[#d5cbac] mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded hover:bg-[#37455a] font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
