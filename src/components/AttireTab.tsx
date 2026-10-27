import React, { useState } from 'react';
import { Trip, LuggageBag, TravelOutfit, TravelOutfitPiece, PackingItem } from '../types';
import { uid } from '../utils/helpers';
import { Briefcase, Shirt, CheckCircle, Clock, Plus, Trash2, Edit2, AlertTriangle, Sparkles, Feather, Archive } from 'lucide-react';

interface AttireTabProps {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
}

export const AttireTab: React.FC<AttireTabProps> = ({ trip, onUpdateTrip }) => {
  const luggageBags = trip.luggageBags || [];
  const outfits = trip.outfits || [];
  const packingList = trip.packingList || [];

  // Modals state
  const [isBagModalOpen, setIsBagModalOpen] = useState(false);
  const [editingBag, setEditingBag] = useState<LuggageBag | null>(null);
  const [bagForm, setBagForm] = useState<Partial<LuggageBag>>({
    name: '',
    type: 'carry_on',
    maxWeightKg: 10,
    currentWeightKg: 0,
    notes: '',
    colorTag: '#b8874f'
  });

  const [isOutfitModalOpen, setIsOutfitModalOpen] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<TravelOutfit | null>(null);
  const [outfitForm, setOutfitForm] = useState<{
    occasion: string;
    dayNumber: number | '';
    timeOfDay: 'day' | 'evening' | 'all_day' | 'travel';
    footwear: string;
    weatherNote: string;
    notes: string;
    wornStatus: 'planned' | 'worn' | 'packed';
    pieces: TravelOutfitPiece[];
  }>({
    occasion: '',
    dayNumber: 1,
    timeOfDay: 'evening',
    footwear: '',
    weatherNote: '',
    notes: '',
    wornStatus: 'planned',
    pieces: []
  });

  const [newPieceName, setNewPieceName] = useState('');
  const [newPieceType, setNewPieceType] = useState<TravelOutfitPiece['type']>('jacket');

  // --- Bag handlers ---
  const handleOpenAddBag = () => {
    setEditingBag(null);
    setBagForm({
      name: '',
      type: 'carry_on',
      maxWeightKg: 10,
      currentWeightKg: 0,
      notes: '',
      colorTag: '#b8874f'
    });
    setIsBagModalOpen(true);
  };

  const handleOpenEditBag = (bag: LuggageBag) => {
    setEditingBag(bag);
    setBagForm({ ...bag });
    setIsBagModalOpen(true);
  };

  const handleSaveBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bagForm.name?.trim()) return;

    let updatedBags: LuggageBag[];
    if (editingBag) {
      updatedBags = luggageBags.map(b => (b.id === editingBag.id ? ({ ...b, ...bagForm } as LuggageBag) : b));
    } else {
      const newBag: LuggageBag = {
        id: uid('bag'),
        name: bagForm.name.trim(),
        type: bagForm.type || 'carry_on',
        maxWeightKg: Number(bagForm.maxWeightKg) || 10,
        currentWeightKg: Number(bagForm.currentWeightKg) || 0,
        notes: bagForm.notes || '',
        colorTag: bagForm.colorTag || '#b8874f'
      };
      updatedBags = [...luggageBags, newBag];
    }

    onUpdateTrip({
      ...trip,
      luggageBags: updatedBags,
      updatedAt: Date.now()
    });
    setIsBagModalOpen(false);
  };

  const handleDeleteBag = (bagId: string) => {
    if (!confirm('Remove this luggage piece from manifest?')) return;
    const updatedBags = luggageBags.filter(b => b.id !== bagId);
    onUpdateTrip({
      ...trip,
      luggageBags: updatedBags,
      updatedAt: Date.now()
    });
  };

  // --- Outfit handlers ---
  const handleOpenAddOutfit = () => {
    setEditingOutfit(null);
    setOutfitForm({
      occasion: '',
      dayNumber: 1,
      timeOfDay: 'evening',
      footwear: '',
      weatherNote: '',
      notes: '',
      wornStatus: 'planned',
      pieces: [
        { id: uid('pc'), name: 'Tailored Blazer / Outerwear', type: 'jacket' },
        { id: uid('pc'), name: 'Formal / Smart Shirt', type: 'top' },
        { id: uid('pc'), name: 'Tailored Trousers', type: 'trousers' }
      ]
    });
    setIsOutfitModalOpen(true);
  };

  const handleOpenEditOutfit = (outfit: TravelOutfit) => {
    setEditingOutfit(outfit);
    setOutfitForm({
      occasion: outfit.occasion,
      dayNumber: outfit.dayNumber ?? '',
      timeOfDay: outfit.timeOfDay,
      footwear: outfit.footwear || '',
      weatherNote: outfit.weatherNote || '',
      notes: outfit.notes || '',
      wornStatus: outfit.wornStatus,
      pieces: [...(outfit.pieces || [])]
    });
    setIsOutfitModalOpen(true);
  };

  const handleAddPieceToForm = () => {
    if (!newPieceName.trim()) return;
    setOutfitForm(prev => ({
      ...prev,
      pieces: [...prev.pieces, { id: uid('pc'), name: newPieceName.trim(), type: newPieceType }]
    }));
    setNewPieceName('');
  };

  const handleRemovePieceFromForm = (pieceId: string) => {
    setOutfitForm(prev => ({
      ...prev,
      pieces: prev.pieces.filter(p => p.id !== pieceId)
    }));
  };

  const handleSaveOutfit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outfitForm.occasion.trim()) return;

    let updatedOutfits: TravelOutfit[];
    if (editingOutfit) {
      updatedOutfits = outfits.map(o =>
        o.id === editingOutfit.id
          ? {
              ...o,
              occasion: outfitForm.occasion.trim(),
              dayNumber: outfitForm.dayNumber === '' ? null : Number(outfitForm.dayNumber),
              timeOfDay: outfitForm.timeOfDay,
              footwear: outfitForm.footwear.trim(),
              weatherNote: outfitForm.weatherNote.trim(),
              notes: outfitForm.notes.trim(),
              wornStatus: outfitForm.wornStatus,
              pieces: outfitForm.pieces
            }
          : o
      );
    } else {
      const newOutfit: TravelOutfit = {
        id: uid('outfit'),
        occasion: outfitForm.occasion.trim(),
        dayNumber: outfitForm.dayNumber === '' ? null : Number(outfitForm.dayNumber),
        timeOfDay: outfitForm.timeOfDay,
        footwear: outfitForm.footwear.trim(),
        weatherNote: outfitForm.weatherNote.trim(),
        notes: outfitForm.notes.trim(),
        wornStatus: outfitForm.wornStatus,
        pieces: outfitForm.pieces
      };
      updatedOutfits = [...outfits, newOutfit];
    }

    onUpdateTrip({
      ...trip,
      outfits: updatedOutfits,
      updatedAt: Date.now()
    });
    setIsOutfitModalOpen(false);
  };

  const handleDeleteOutfit = (outfitId: string) => {
    if (!confirm('Remove this curated ensemble?')) return;
    const updated = outfits.filter(o => o.id !== outfitId);
    onUpdateTrip({
      ...trip,
      outfits: updated,
      updatedAt: Date.now()
    });
  };

  const handleToggleOutfitStatus = (outfit: TravelOutfit) => {
    const cycle: Record<TravelOutfit['wornStatus'], TravelOutfit['wornStatus']> = {
      planned: 'worn',
      worn: 'packed',
      packed: 'planned'
    };
    const nextStatus = cycle[outfit.wornStatus];
    const updated = outfits.map(o => (o.id === outfit.id ? { ...o, wornStatus: nextStatus } : o));
    onUpdateTrip({
      ...trip,
      outfits: updated,
      updatedAt: Date.now()
    });
  };

  // Garment Care toggle on packing items
  const handleToggleGarmentCare = (item: PackingItem) => {
    const cycle: Record<string, PackingItem['careStatus']> = {
      fresh: 'worn',
      worn: 'laundry',
      laundry: 'fresh',
      undefined: 'worn'
    };
    const current = item.careStatus || 'fresh';
    const nextCare = cycle[current] || 'fresh';

    const updatedPacking = packingList.map(p => (p.id === item.id ? { ...p, careStatus: nextCare } : p));
    onUpdateTrip({
      ...trip,
      packingList: updatedPacking,
      updatedAt: Date.now()
    });
  };

  // Totals & stats
  const totalWeight = luggageBags.reduce((acc, b) => acc + (b.currentWeightKg || 0), 0);
  const totalAllowance = luggageBags.reduce((acc, b) => acc + (b.maxWeightKg || 0), 0);
  const clothingItems = packingList.filter(p => p.category === 'Clothing');
  const freshCount = clothingItems.filter(p => !p.careStatus || p.careStatus === 'fresh').length;
  const wornCount = clothingItems.filter(p => p.careStatus === 'worn').length;
  const laundryCount = clothingItems.filter(p => p.careStatus === 'laundry').length;

  return (
    <div className="attire-tab-container space-y-6">
      {/* Top Banner / Philosophy */}
      <div className="bg-[#fcfaf5] border border-[#d5cbac] rounded-lg p-5 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none flex items-center justify-center">
          <Shirt size={120} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#b8874f] font-mono text-xs uppercase tracking-wider font-semibold">
              <Briefcase size={14} /> Travel Luggage & Attire Manifest
            </div>
            <h2 className="text-xl font-serif font-bold text-[#1c2530] mt-1">
              Curated Ensembles & Luggage Weight Ledger
            </h2>
            <p className="text-sm text-[#5b6672] mt-0.5 max-w-xl">
              Precision travel wardrobe planning by day and occasion. Track baggage weight allowances, ensemble pairings, and garment care in transit.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAddBag}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold uppercase tracking-wider bg-[#eae4d3] hover:bg-[#d5cbac] text-[#1c2530] border border-[#c7bb98] rounded transition-colors"
            >
              <Plus size={14} /> Add Luggage Bag
            </button>
            <button
              onClick={handleOpenAddOutfit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold uppercase tracking-wider bg-[#1c2530] hover:bg-[#37455a] text-[#f4efe2] rounded shadow-xs transition-colors"
            >
              <Plus size={14} /> Curate Outfit
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#e2d8bd]">
          <div className="bg-[#f4efe2] border border-[#d5cbac] rounded p-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672]">Luggage Pieces</div>
            <div className="text-lg font-serif font-bold text-[#1c2530] mt-0.5">{luggageBags.length} registered</div>
          </div>
          <div className="bg-[#f4efe2] border border-[#d5cbac] rounded p-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672]">Total Baggage Weight</div>
            <div className="text-lg font-serif font-bold text-[#1c2530] mt-0.5">
              {totalWeight.toFixed(1)} <span className="text-xs font-mono font-normal text-[#5b6672]">/ {totalAllowance} kg</span>
            </div>
          </div>
          <div className="bg-[#f4efe2] border border-[#d5cbac] rounded p-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672]">Planned Ensembles</div>
            <div className="text-lg font-serif font-bold text-[#1c2530] mt-0.5">{outfits.length} curated</div>
          </div>
          <div className="bg-[#f4efe2] border border-[#d5cbac] rounded p-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672]">Garment Status</div>
            <div className="text-xs font-mono font-medium text-[#1c2530] mt-1 flex items-center gap-2">
              <span className="text-[#35695c] font-bold">{freshCount} Fresh</span> • 
              <span className="text-[#b8874f] font-bold">{wornCount} Worn</span> • 
              <span className="text-[#a63a2e] font-bold">{laundryCount} Laundry</span>
            </div>
          </div>
        </div>
      </div>

      {/* Luggage Pieces Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#b8874f]"></span>
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#1c2530]">
              Registered Baggage & Weight Allowances
            </h3>
          </div>
          <span className="text-xs text-[#5b6672] font-mono">
            {totalWeight > totalAllowance && totalAllowance > 0 ? (
              <span className="text-[#a63a2e] font-bold inline-flex items-center gap-1">
                <AlertTriangle size={12} /> Over allowance by {(totalWeight - totalAllowance).toFixed(1)} kg
              </span>
            ) : (
              `${(totalAllowance - totalWeight).toFixed(1)} kg remaining`
            )}
          </span>
        </div>

        {luggageBags.length === 0 ? (
          <div className="text-center py-8 bg-[#fcfaf5] border border-dashed border-[#c7bb98] rounded-lg">
            <Briefcase size={28} className="mx-auto text-[#b8874f] mb-2 opacity-60" />
            <p className="text-sm font-serif text-[#1c2530]">No luggage pieces recorded for this journey.</p>
            <p className="text-xs text-[#5b6672] mt-1 font-mono">
              Register your cabin trolley, weekender, or garment holdall to ensure airline compliance.
            </p>
            <button
              onClick={handleOpenAddBag}
              className="mt-3 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded hover:bg-[#37455a]"
            >
              Add First Bag
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {luggageBags.map(bag => {
              const current = bag.currentWeightKg || 0;
              const max = bag.maxWeightKg || 10;
              const pct = Math.min(100, Math.round((current / max) * 100));
              const isOver = current > max;

              return (
                <div
                  key={bag.id}
                  className="bg-[#fcfaf5] border border-[#d5cbac] rounded-lg p-4 relative group hover:border-[#b8874f] transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: bag.colorTag || '#b8874f' }}
                        />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672]">
                          {bag.type.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-base font-serif font-bold text-[#1c2530] mt-0.5">{bag.name}</h4>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => handleOpenEditBag(bag)}
                        className="p-1 text-[#5b6672] hover:text-[#1c2530] rounded hover:bg-[#eae4d3]"
                        title="Edit bag"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteBag(bag.id)}
                        className="p-1 text-[#5b6672] hover:text-[#a63a2e] rounded hover:bg-[#eae4d3]"
                        title="Delete bag"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {bag.notes && <p className="text-xs text-[#5b6672] mt-2 italic">{bag.notes}</p>}

                  {/* Weight Progress Bar */}
                  <div className="mt-4 pt-3 border-t border-[#e2d8bd]">
                    <div className="flex justify-between items-baseline text-xs font-mono mb-1">
                      <span className="text-[#5b6672]">Packed Weight:</span>
                      <span className={`font-bold ${isOver ? 'text-[#a63a2e]' : 'text-[#1c2530]'}`}>
                        {current.toFixed(1)} / {max} kg
                      </span>
                    </div>
                    <div className="w-full bg-[#eae4d3] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver ? 'bg-[#a63a2e]' : pct > 85 ? 'bg-[#b8874f]' : 'bg-[#35695c]'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Curated Travel Outfits Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#35597a]"></span>
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#1c2530]">
              Day-by-Day Travel Ensembles
            </h3>
          </div>
          <button
            onClick={handleOpenAddOutfit}
            className="text-xs font-mono uppercase tracking-wider text-[#b8874f] hover:underline inline-flex items-center gap-1 font-semibold"
          >
            <Plus size={13} /> New Ensemble
          </button>
        </div>

        {outfits.length === 0 ? (
          <div className="text-center py-8 bg-[#fcfaf5] border border-dashed border-[#c7bb98] rounded-lg">
            <Feather size={28} className="mx-auto text-[#35597a] mb-2 opacity-60" />
            <p className="text-sm font-serif text-[#1c2530]">No travel ensembles curated yet.</p>
            <p className="text-xs text-[#5b6672] mt-1 font-mono">
              Plan out attire for special dinners, excursions, or travel days.
            </p>
            <button
              onClick={handleOpenAddOutfit}
              className="mt-3 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded hover:bg-[#37455a]"
            >
              Curate Day 1 Outfit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outfits.map(outfit => {
              const statusColors: Record<TravelOutfit['wornStatus'], { bg: string; text: string; label: string }> = {
                planned: { bg: '#eae4d3', text: '#5b6672', label: 'Planned' },
                worn: { bg: '#d5e4df', text: '#35695c', label: 'Worn Today' },
                packed: { bg: '#e8dfe9', text: '#6a4a6e', label: 'Packed Away' }
              };
              const statusCfg = statusColors[outfit.wornStatus] || statusColors.planned;

              return (
                <div
                  key={outfit.id}
                  className="bg-[#fcfaf5] border border-[#d5cbac] rounded-lg p-4 shadow-xs relative hover:border-[#b8874f] transition-all"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-[#e2d8bd] pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        {outfit.dayNumber != null && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded">
                            Day {outfit.dayNumber}
                          </span>
                        )}
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#b8874f] font-semibold">
                          {outfit.timeOfDay}
                        </span>
                      </div>
                      <h4 className="text-base font-serif font-bold text-[#1c2530] mt-1">{outfit.occasion}</h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleOutfitStatus(outfit)}
                        className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider font-semibold rounded border border-[#c7bb98] transition-colors"
                        style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}
                        title="Click to cycle status: Planned -> Worn -> Packed"
                      >
                        {statusCfg.label}
                      </button>
                      <button
                        onClick={() => handleOpenEditOutfit(outfit)}
                        className="p-1 text-[#5b6672] hover:text-[#1c2530] rounded hover:bg-[#eae4d3]"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteOutfit(outfit.id)}
                        className="p-1 text-[#5b6672] hover:text-[#a63a2e] rounded hover:bg-[#eae4d3]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Pieces list */}
                  <div className="mt-3 space-y-1.5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672] font-semibold">
                      Ensemble Pieces:
                    </div>
                    {outfit.pieces && outfit.pieces.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {outfit.pieces.map(piece => (
                          <span
                            key={piece.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-[#f4efe2] border border-[#d5cbac] text-[#1c2530] rounded"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#b8874f]"></span>
                            <span className="font-medium">{piece.name}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#5b6672] italic">No individual garments specified.</p>
                    )}
                  </div>

                  {/* Footwear & Weather notes */}
                  <div className="mt-3 pt-2.5 border-t border-[#e2d8bd] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5b6672]">
                    {outfit.footwear && (
                      <div className="font-mono text-[11px]">
                        <span className="text-[#8a7a3a] font-semibold">Footwear:</span> {outfit.footwear}
                      </div>
                    )}
                    {outfit.weatherNote && (
                      <div className="font-mono text-[11px] italic bg-[#eae4d3] px-2 py-0.5 rounded">
                        {outfit.weatherNote}
                      </div>
                    )}
                  </div>

                  {outfit.notes && <p className="text-xs text-[#5b6672] mt-2 italic">{outfit.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Garment Care Ledger (Interactive status toggling for all packed clothing) */}
      <div className="bg-[#fcfaf5] border border-[#d5cbac] rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-[#e2d8bd] pb-2">
          <div className="flex items-center gap-2">
            <Archive size={15} className="text-[#b8874f]" />
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#1c2530]">
              Garment Care & Transit Tracker
            </h3>
          </div>
          <span className="text-xs text-[#5b6672] font-mono">
            Click status pill to cycle: Fresh → Worn → Laundry
          </span>
        </div>

        {clothingItems.length === 0 ? (
          <p className="text-xs text-[#5b6672] italic py-2">
            No clothing items found in your trip Packing list. Add garments under the Packing tab to monitor their care state.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {clothingItems.map(item => {
              const care = item.careStatus || 'fresh';
              const careBadge =
                care === 'laundry'
                  ? { text: 'Laundry Sent', bg: '#f9e8e6', color: '#a63a2e' }
                  : care === 'worn'
                  ? { text: 'Worn', bg: '#f6eedc', color: '#b8874f' }
                  : { text: 'Fresh / Ready', bg: '#e8f3ef', color: '#35695c' };

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded bg-[#f4efe2] border border-[#d5cbac] text-xs"
                >
                  <span className="font-medium text-[#1c2530] truncate pr-2">{item.name}</span>
                  <button
                    onClick={() => handleToggleGarmentCare(item)}
                    className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold rounded border border-transparent hover:border-[#c7bb98] transition-all cursor-pointer shrink-0"
                    style={{ backgroundColor: careBadge.bg, color: careBadge.color }}
                  >
                    {careBadge.text}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- ADD / EDIT BAG MODAL --- */}
      {isBagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#fcfaf5] border-2 border-[#1c2530] rounded-lg max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-serif font-bold text-[#1c2530] mb-4">
              {editingBag ? 'Edit Luggage Piece' : 'Register Luggage Piece'}
            </h3>
            <form onSubmit={handleSaveBag} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                  Bag Name / Model *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rimowa Essential Cabin 36L"
                  value={bagForm.name || ''}
                  onChange={e => setBagForm({ ...bagForm, name: e.target.value })}
                  className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Baggage Type
                  </label>
                  <select
                    value={bagForm.type || 'carry_on'}
                    onChange={e => setBagForm({ ...bagForm, type: e.target.value as any })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  >
                    <option value="carry_on">Carry-On Trolley</option>
                    <option value="checked">Checked Suitcase</option>
                    <option value="personal_item">Personal Bag / Briefcase</option>
                    <option value="garment_bag">Garment Holdall</option>
                    <option value="specialty_case">Specialty Travel Case</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Color Accent
                  </label>
                  <input
                    type="color"
                    value={bagForm.colorTag || '#b8874f'}
                    onChange={e => setBagForm({ ...bagForm, colorTag: e.target.value })}
                    className="w-full h-9 p-1 border border-[#c7bb98] rounded bg-[#f4efe2] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Weight Limit (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={bagForm.maxWeightKg ?? 10}
                    onChange={e => setBagForm({ ...bagForm, maxWeightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Current Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={bagForm.currentWeightKg ?? 0}
                    onChange={e => setBagForm({ ...bagForm, currentWeightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                  Notes / Airline Rules
                </label>
                <input
                  type="text"
                  placeholder="e.g. British Airways 23kg max allowance, overhead cabin fit"
                  value={bagForm.notes || ''}
                  onChange={e => setBagForm({ ...bagForm, notes: e.target.value })}
                  className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#d5cbac]">
                <button
                  type="button"
                  onClick={() => setIsBagModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#5b6672] hover:bg-[#eae4d3] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded hover:bg-[#37455a] font-bold"
                >
                  Save Bag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT OUTFIT MODAL --- */}
      {isOutfitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#fcfaf5] border-2 border-[#1c2530] rounded-lg max-w-lg w-full p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-serif font-bold text-[#1c2530] mb-4">
              {editingOutfit ? 'Edit Travel Ensemble' : 'Curate Travel Ensemble'}
            </h3>
            <form onSubmit={handleSaveOutfit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                  Occasion / Plan Destination *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dinner at Le Gabriel / St. James's Tailoring Walk"
                  value={outfitForm.occasion}
                  onChange={e => setOutfitForm({ ...outfitForm, occasion: e.target.value })}
                  className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Day Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1"
                    value={outfitForm.dayNumber}
                    onChange={e =>
                      setOutfitForm({ ...outfitForm, dayNumber: e.target.value === '' ? '' : parseInt(e.target.value) })
                    }
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Time / Context
                  </label>
                  <select
                    value={outfitForm.timeOfDay}
                    onChange={e => setOutfitForm({ ...outfitForm, timeOfDay: e.target.value as any })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  >
                    <option value="evening">Evening / Dinner</option>
                    <option value="day">Daytime / Excursion</option>
                    <option value="travel">Transit / Flight</option>
                    <option value="all_day">All Day</option>
                  </select>
                </div>
              </div>

              {/* Pieces builder */}
              <div className="p-3 bg-[#f4efe2] border border-[#d5cbac] rounded-md space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#1c2530] font-bold">
                  Ensemble Garments & Accessories
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Suit Supply Navy Wool Blazer"
                    value={newPieceName}
                    onChange={e => setNewPieceName(e.target.value)}
                    className="flex-1 text-xs p-1.5 border border-[#c7bb98] rounded bg-[#fcfaf5] text-[#1c2530]"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPieceToForm();
                      }
                    }}
                  />
                  <select
                    value={newPieceType}
                    onChange={e => setNewPieceType(e.target.value as any)}
                    className="text-xs p-1.5 border border-[#c7bb98] rounded bg-[#fcfaf5] text-[#1c2530]"
                  >
                    <option value="jacket">Jacket / Knit</option>
                    <option value="top">Shirt / Top</option>
                    <option value="trousers">Trousers / Chinos</option>
                    <option value="footwear">Footwear</option>
                    <option value="accessory">Accessory</option>
                    <option value="fragrance">Fragrance</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddPieceToForm}
                    className="px-2.5 py-1 text-xs font-mono uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded hover:bg-[#37455a]"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {outfitForm.pieces.map(piece => (
                    <span
                      key={piece.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs bg-[#fcfaf5] border border-[#d5cbac] text-[#1c2530] rounded"
                    >
                      <span>{piece.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePieceFromForm(piece.id)}
                        className="text-[#a63a2e] hover:font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Footwear Pairing
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Edward Green Dark Oak Oxfords"
                    value={outfitForm.footwear}
                    onChange={e => setOutfitForm({ ...outfitForm, footwear: e.target.value })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Weather / Temperature Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mild 16°C, light drizzle expected"
                    value={outfitForm.weatherNote}
                    onChange={e => setOutfitForm({ ...outfitForm, weatherNote: e.target.value })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                  Styling Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pocket square required, umbrella in day bag"
                  value={outfitForm.notes}
                  onChange={e => setOutfitForm({ ...outfitForm, notes: e.target.value })}
                  className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#d5cbac]">
                <button
                  type="button"
                  onClick={() => setIsOutfitModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#5b6672] hover:bg-[#eae4d3] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded hover:bg-[#37455a] font-bold"
                >
                  Save Ensemble
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
