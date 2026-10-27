import React, { useState } from 'react';
import { Trip, TravelHaulItem, TravelLoungeVisit } from '../types';
import { uid } from '../utils/helpers';
import { Package, Compass, Star, Plus, Trash2, Edit2, ShieldCheck, ShoppingBag, Wine, Flame, Sparkles } from 'lucide-react';

interface HaulsTabProps {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
}

export const HaulsTab: React.FC<HaulsTabProps> = ({ trip, onUpdateTrip }) => {
  const hauls = trip.hauls || [];
  const lounges = trip.loungeVisits || [];

  // Haul Modal
  const [isHaulModalOpen, setIsHaulModalOpen] = useState(false);
  const [editingHaul, setEditingHaul] = useState<TravelHaulItem | null>(null);
  const [haulForm, setHaulForm] = useState<Partial<TravelHaulItem>>({
    name: '',
    merchant: '',
    category: 'cigars',
    formatOrSpec: '',
    quantity: 1,
    unitPrice: 0,
    currency: '£',
    dutyFreeCategory: 'tobacco',
    notes: '',
    dateAcquired: ''
  });

  // Lounge Modal
  const [isLoungeModalOpen, setIsLoungeModalOpen] = useState(false);
  const [editingLounge, setEditingLounge] = useState<TravelLoungeVisit | null>(null);
  const [loungeForm, setLoungeForm] = useState<Partial<TravelLoungeVisit>>({
    venueName: '',
    city: trip.name ? trip.name.split(' ')[0] : '',
    date: trip.startDate || '',
    rating: 5,
    pairingOrSelection: '',
    atmosphereNotes: '',
    isPrivateOrMembersClub: false
  });

  // --- Haul Handlers ---
  const handleOpenAddHaul = () => {
    setEditingHaul(null);
    setHaulForm({
      name: '',
      merchant: '',
      category: 'cigars',
      formatOrSpec: '',
      quantity: 1,
      unitPrice: 0,
      currency: '£',
      dutyFreeCategory: 'tobacco',
      notes: '',
      dateAcquired: trip.startDate || ''
    });
    setIsHaulModalOpen(true);
  };

  const handleOpenEditHaul = (item: TravelHaulItem) => {
    setEditingHaul(item);
    setHaulForm({ ...item });
    setIsHaulModalOpen(true);
  };

  const handleSaveHaul = (e: React.FormEvent) => {
    e.preventDefault();
    if (!haulForm.name?.trim()) return;

    let updatedHauls: TravelHaulItem[];
    if (editingHaul) {
      updatedHauls = hauls.map(h => (h.id === editingHaul.id ? ({ ...h, ...haulForm } as TravelHaulItem) : h));
    } else {
      const newHaul: TravelHaulItem = {
        id: uid('haul'),
        name: haulForm.name.trim(),
        merchant: haulForm.merchant?.trim() || '',
        category: haulForm.category || 'cigars',
        formatOrSpec: haulForm.formatOrSpec?.trim() || '',
        quantity: Number(haulForm.quantity) || 1,
        unitPrice: Number(haulForm.unitPrice) || 0,
        currency: haulForm.currency || '£',
        dutyFreeCategory: haulForm.dutyFreeCategory || 'none',
        notes: haulForm.notes?.trim() || '',
        dateAcquired: haulForm.dateAcquired || ''
      };
      updatedHauls = [...hauls, newHaul];
    }

    onUpdateTrip({
      ...trip,
      hauls: updatedHauls,
      updatedAt: Date.now()
    });
    setIsHaulModalOpen(false);
  };

  const handleDeleteHaul = (haulId: string) => {
    if (!confirm('Remove this haul item from travel records?')) return;
    const updated = hauls.filter(h => h.id !== haulId);
    onUpdateTrip({
      ...trip,
      hauls: updated,
      updatedAt: Date.now()
    });
  };

  // --- Lounge Handlers ---
  const handleOpenAddLounge = () => {
    setEditingLounge(null);
    setLoungeForm({
      venueName: '',
      city: trip.name ? trip.name.split(' ')[0] : '',
      date: trip.startDate || '',
      rating: 5,
      pairingOrSelection: '',
      atmosphereNotes: '',
      isPrivateOrMembersClub: false
    });
    setIsLoungeModalOpen(true);
  };

  const handleOpenEditLounge = (item: TravelLoungeVisit) => {
    setEditingLounge(item);
    setLoungeForm({ ...item });
    setIsLoungeModalOpen(true);
  };

  const handleSaveLounge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loungeForm.venueName?.trim()) return;

    let updatedLounges: TravelLoungeVisit[];
    if (editingLounge) {
      updatedLounges = lounges.map(l => (l.id === editingLounge.id ? ({ ...l, ...loungeForm } as TravelLoungeVisit) : l));
    } else {
      const newLounge: TravelLoungeVisit = {
        id: uid('lng'),
        venueName: loungeForm.venueName.trim(),
        city: loungeForm.city?.trim() || '',
        date: loungeForm.date || '',
        rating: Number(loungeForm.rating) || 5,
        pairingOrSelection: loungeForm.pairingOrSelection?.trim() || '',
        atmosphereNotes: loungeForm.atmosphereNotes?.trim() || '',
        isPrivateOrMembersClub: !!loungeForm.isPrivateOrMembersClub
      };
      updatedLounges = [...lounges, newLounge];
    }

    onUpdateTrip({
      ...trip,
      loungeVisits: updatedLounges,
      updatedAt: Date.now()
    });
    setIsLoungeModalOpen(false);
  };

  const handleDeleteLounge = (loungeId: string) => {
    if (!confirm('Remove this lounge tasting entry?')) return;
    const updated = lounges.filter(l => l.id !== loungeId);
    onUpdateTrip({
      ...trip,
      loungeVisits: updated,
      updatedAt: Date.now()
    });
  };

  // Customs calculations
  const totalHaulSpend = hauls.reduce((acc, h) => acc + (h.unitPrice || 0) * (h.quantity || 1), 0);
  const totalCigarsCount = hauls
    .filter(h => h.category === 'cigars' || h.dutyFreeCategory === 'tobacco')
    .reduce((acc, h) => acc + (h.quantity || 1), 0);
  const totalSpiritCount = hauls
    .filter(h => h.category === 'spirits' || h.dutyFreeCategory === 'alcohol')
    .reduce((acc, h) => acc + (h.quantity || 1), 0);

  // Standard UK/EU Duty free allowance limits for reference
  const cigarAllowanceMax = 50;
  const spiritAllowanceMax = 4;

  return (
    <div className="hauls-tab-container space-y-6">
      {/* Top Banner */}
      <div className="bg-[#fcfaf5] border border-[#d5cbac] rounded-lg p-5 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none flex items-center justify-center">
          <Wine size={120} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#b8874f] font-mono text-xs uppercase tracking-wider font-semibold">
              <Compass size={14} /> Travel Curations & Lounge Journal
            </div>
            <h2 className="text-xl font-serif font-bold text-[#1c2530] mt-1">
              Specialty Travel Hauls & Tasting Diary
            </h2>
            <p className="text-sm text-[#5b6672] mt-0.5 max-w-xl">
              Track luxury acquisitions made while travelling—such as bespoke tailoring, boutique perfumery, regional spirits, and cigar salon purchases—with customs allowance monitors.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAddHaul}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold uppercase tracking-wider bg-[#1c2530] hover:bg-[#37455a] text-[#f4efe2] rounded shadow-xs transition-colors"
            >
              <Plus size={14} /> Record Haul Item
            </button>
            <button
              onClick={handleOpenAddLounge}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold uppercase tracking-wider bg-[#eae4d3] hover:bg-[#d5cbac] text-[#1c2530] border border-[#c7bb98] rounded transition-colors"
            >
              <Plus size={14} /> Log Lounge Visit
            </button>
          </div>
        </div>

        {/* Customs & Allowance Gauge Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#e2d8bd]">
          {/* Total Haul Valuation */}
          <div className="bg-[#f4efe2] border border-[#d5cbac] rounded p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672]">Total Haul Valuation</div>
            <div className="text-lg font-serif font-bold text-[#1c2530] mt-0.5">
              £{totalHaulSpend.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-mono text-[#5b6672] mt-0.5">{hauls.length} acquisitions logged</div>
          </div>

          {/* Cigar / Tobacco Allowance Monitor */}
          <div className="bg-[#f4efe2] border border-[#d5cbac] rounded p-3">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672]">Cigar Allowance</span>
              <span className="text-xs font-mono font-bold text-[#1c2530]">
                {totalCigarsCount} / {cigarAllowanceMax} sticks
              </span>
            </div>
            <div className="w-full bg-[#eae4d3] h-2 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full transition-all ${
                  totalCigarsCount > cigarAllowanceMax ? 'bg-[#a63a2e]' : 'bg-[#b8874f]'
                }`}
                style={{ width: `${Math.min(100, (totalCigarsCount / cigarAllowanceMax) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-[#5b6672] mt-1">Personal duty-free allowance indicator</div>
          </div>

          {/* Spirits Allowance Monitor */}
          <div className="bg-[#f4efe2] border border-[#d5cbac] rounded p-3">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672]">Spirits Allowance</span>
              <span className="text-xs font-mono font-bold text-[#1c2530]">
                {totalSpiritCount} / {spiritAllowanceMax} bottles
              </span>
            </div>
            <div className="w-full bg-[#eae4d3] h-2 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full transition-all ${
                  totalSpiritCount > spiritAllowanceMax ? 'bg-[#a63a2e]' : 'bg-[#35695c]'
                }`}
                style={{ width: `${Math.min(100, (totalSpiritCount / spiritAllowanceMax) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-[#5b6672] mt-1">{lounges.length} lounge visits logged</div>
          </div>
        </div>
      </div>

      {/* Specialty Acquisitions Ledger */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#b8874f]"></span>
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#1c2530]">
              Travel Acquisitions & Hauls Manifest
            </h3>
          </div>
          <button
            onClick={handleOpenAddHaul}
            className="text-xs font-mono uppercase tracking-wider text-[#b8874f] hover:underline inline-flex items-center gap-1 font-semibold"
          >
            <Plus size={13} /> Add Acquisition
          </button>
        </div>

        {hauls.length === 0 ? (
          <div className="text-center py-8 bg-[#fcfaf5] border border-dashed border-[#c7bb98] rounded-lg">
            <ShoppingBag size={28} className="mx-auto text-[#b8874f] mb-2 opacity-60" />
            <p className="text-sm font-serif text-[#1c2530]">No travel acquisitions recorded.</p>
            <p className="text-xs text-[#5b6672] mt-1 font-mono">
              Keep a detailed record of boutique tailoring, cigar hauls, and duty-free goods.
            </p>
            <button
              onClick={handleOpenAddHaul}
              className="mt-3 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded hover:bg-[#37455a]"
            >
              Add First Haul Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {hauls.map(haul => {
              const catIcons: Record<TravelHaulItem['category'], React.ReactNode> = {
                cigars: <Flame size={13} className="text-[#b8874f]" />,
                tailoring: <ShoppingBag size={13} className="text-[#35597a]" />,
                spirits: <Wine size={13} className="text-[#a63a2e]" />,
                perfume: <Sparkles size={13} className="text-[#6a4a6e]" />,
                leather_goods: <Package size={13} className="text-[#8a7a3a]" />,
                accessories: <Compass size={13} className="text-[#35695c]" />,
                other: <Package size={13} className="text-[#5b6672]" />
              };

              return (
                <div
                  key={haul.id}
                  className="bg-[#fcfaf5] border border-[#d5cbac] rounded-lg p-4 shadow-xs relative hover:border-[#b8874f] transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {catIcons[haul.category] || catIcons.other}
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#5b6672]">
                          {haul.category}
                        </span>
                        {haul.dutyFreeCategory !== 'none' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider bg-[#eae4d3] text-[#1c2530] rounded">
                            Duty Free: {haul.dutyFreeCategory}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-serif font-bold text-[#1c2530] mt-1">{haul.name}</h4>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => handleOpenEditHaul(haul)}
                        className="p-1 text-[#5b6672] hover:text-[#1c2530] rounded hover:bg-[#eae4d3]"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteHaul(haul.id)}
                        className="p-1 text-[#5b6672] hover:text-[#a63a2e] rounded hover:bg-[#eae4d3]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {haul.merchant && (
                    <div className="text-xs text-[#8a7a3a] font-mono mt-1 font-medium">
                      Boutique: {haul.merchant}
                    </div>
                  )}

                  {haul.formatOrSpec && (
                    <div className="text-xs text-[#5b6672] font-mono mt-0.5">
                      Spec / Vitola: <span className="font-semibold text-[#1c2530]">{haul.formatOrSpec}</span>
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-[#e2d8bd] flex items-center justify-between text-xs">
                    <span className="font-mono text-[#5b6672]">Qty: {haul.quantity}</span>
                    <span className="font-mono font-bold text-[#1c2530]">
                      {haul.currency}
                      {haul.unitPrice.toFixed(2)} ea{' '}
                      {haul.quantity > 1 && (
                        <span className="text-[#5b6672] font-normal">
                          ({haul.currency}
                          {(haul.unitPrice * haul.quantity).toFixed(2)})
                        </span>
                      )}
                    </span>
                  </div>

                  {haul.notes && <p className="text-xs text-[#5b6672] mt-2 italic border-t border-[#f4efe2] pt-1">{haul.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Travel Lounge & Tasting Journal Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6a4a6e]"></span>
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#1c2530]">
              Travel Lounge & Tasting Journal
            </h3>
          </div>
          <button
            onClick={handleOpenAddLounge}
            className="text-xs font-mono uppercase tracking-wider text-[#b8874f] hover:underline inline-flex items-center gap-1 font-semibold"
          >
            <Plus size={13} /> Log Visit
          </button>
        </div>

        {lounges.length === 0 ? (
          <div className="text-center py-8 bg-[#fcfaf5] border border-dashed border-[#c7bb98] rounded-lg">
            <Wine size={28} className="mx-auto text-[#6a4a6e] mb-2 opacity-60" />
            <p className="text-sm font-serif text-[#1c2530]">No lounge visits or tastings recorded.</p>
            <p className="text-xs text-[#5b6672] mt-1 font-mono">
              Document sampling rooms, rooftop terraces, and private clubs.
            </p>
            <button
              onClick={handleOpenAddLounge}
              className="mt-3 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded hover:bg-[#37455a]"
            >
              Log First Lounge Visit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lounges.map(lounge => (
              <div
                key={lounge.id}
                className="bg-[#fcfaf5] border border-[#d5cbac] rounded-lg p-4 shadow-xs relative hover:border-[#b8874f] transition-all"
              >
                <div className="flex items-start justify-between border-b border-[#e2d8bd] pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#b8874f] font-semibold">
                        {lounge.city || 'Travel Destination'}
                      </span>
                      {lounge.isPrivateOrMembersClub && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-[#6a4a6e] text-white rounded">
                          Members Only
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-serif font-bold text-[#1c2530] mt-0.5">{lounge.venueName}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex text-[#b8874f] mr-2">
                      {[1, 2, 3, 4, 5].map(st => (
                        <Star
                          key={st}
                          size={13}
                          fill={st <= lounge.rating ? '#b8874f' : 'transparent'}
                          stroke="#b8874f"
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => handleOpenEditLounge(lounge)}
                      className="p-1 text-[#5b6672] hover:text-[#1c2530] rounded hover:bg-[#eae4d3]"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteLounge(lounge.id)}
                      className="p-1 text-[#5b6672] hover:text-[#a63a2e] rounded hover:bg-[#eae4d3]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {lounge.pairingOrSelection && (
                  <div className="mt-2.5 text-xs text-[#1c2530]">
                    <span className="font-mono text-[#8a7a3a] font-semibold">Pairing & Selection: </span>
                    <span className="font-medium italic">{lounge.pairingOrSelection}</span>
                  </div>
                )}

                {lounge.atmosphereNotes && (
                  <p className="mt-2 text-xs text-[#5b6672] bg-[#f4efe2] p-2 rounded border border-[#e2d8bd]">
                    "{lounge.atmosphereNotes}"
                  </p>
                )}

                {lounge.date && (
                  <div className="mt-2 text-right font-mono text-[10px] text-[#5b6672]">
                    Visited on {lounge.date}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- ADD / EDIT HAUL MODAL --- */}
      {isHaulModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#fcfaf5] border-2 border-[#1c2530] rounded-lg max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-serif font-bold text-[#1c2530] mb-4">
              {editingHaul ? 'Edit Haul Item' : 'Record Travel Acquisition'}
            </h3>
            <form onSubmit={handleSaveHaul} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                  Item Name / Release *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Davidoff Signature No. 2 Tubos / Lock & Co. Panama"
                  value={haulForm.name || ''}
                  onChange={e => setHaulForm({ ...haulForm, name: e.target.value })}
                  className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Category
                  </label>
                  <select
                    value={haulForm.category || 'cigars'}
                    onChange={e => setHaulForm({ ...haulForm, category: e.target.value as any })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  >
                    <option value="cigars">Cigars & Tobacco</option>
                    <option value="tailoring">Tailoring & Apparel</option>
                    <option value="spirits">Spirits & Wine</option>
                    <option value="perfume">Perfumery & Scents</option>
                    <option value="leather_goods">Leather Goods</option>
                    <option value="accessories">Accessories</option>
                    <option value="other">Other Luxury</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Duty Free Class
                  </label>
                  <select
                    value={haulForm.dutyFreeCategory || 'none'}
                    onChange={e => setHaulForm({ ...haulForm, dutyFreeCategory: e.target.value as any })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  >
                    <option value="none">Standard Goods</option>
                    <option value="tobacco">Tobacco / Cigars</option>
                    <option value="alcohol">Alcohol / Spirits</option>
                    <option value="goods">Valuable Goods (&gt;£390)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Boutique / Merchant
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Davidoff St. James's"
                    value={haulForm.merchant || ''}
                    onChange={e => setHaulForm({ ...haulForm, merchant: e.target.value })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Format / Vitola / Size
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Panetela 6 x 38 / 40R"
                    value={haulForm.formatOrSpec || ''}
                    onChange={e => setHaulForm({ ...haulForm, formatOrSpec: e.target.value })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={haulForm.quantity ?? 1}
                    onChange={e => setHaulForm({ ...haulForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Currency
                  </label>
                  <select
                    value={haulForm.currency || '£'}
                    onChange={e => setHaulForm({ ...haulForm, currency: e.target.value })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  >
                    <option value="£">£ GBP</option>
                    <option value="€">€ EUR</option>
                    <option value="$">$ USD</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={haulForm.unitPrice ?? 0}
                    onChange={e => setHaulForm({ ...haulForm, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                  Tasting / Acquisition Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Limited cedar-box edition, stored in travel humidor"
                  value={haulForm.notes || ''}
                  onChange={e => setHaulForm({ ...haulForm, notes: e.target.value })}
                  className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#d5cbac]">
                <button
                  type="button"
                  onClick={() => setIsHaulModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#5b6672] hover:bg-[#eae4d3] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded hover:bg-[#37455a] font-bold"
                >
                  Save Haul
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT LOUNGE MODAL --- */}
      {isLoungeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#fcfaf5] border-2 border-[#1c2530] rounded-lg max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-serif font-bold text-[#1c2530] mb-4">
              {editingLounge ? 'Edit Lounge Visit' : 'Log Lounge / Tasting Visit'}
            </h3>
            <form onSubmit={handleSaveLounge} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                  Venue / Salon Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Churchill Bar & Terrace / JJ Fox Sampling Lounge"
                  value={loungeForm.venueName || ''}
                  onChange={e => setLoungeForm({ ...loungeForm, venueName: e.target.value })}
                  className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    City / Neighborhood
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mayfair, London"
                    value={loungeForm.city || ''}
                    onChange={e => setLoungeForm({ ...loungeForm, city: e.target.value })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                    Star Rating (1-5)
                  </label>
                  <select
                    value={loungeForm.rating ?? 5}
                    onChange={e => setLoungeForm({ ...loungeForm, rating: parseInt(e.target.value) || 5 })}
                    className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                  >
                    <option value="5">★★★★★ Exceptional</option>
                    <option value="4">★★★★☆ Very Good</option>
                    <option value="3">★★★☆☆ Satisfactory</option>
                    <option value="2">★★☆☆☆ Fair</option>
                    <option value="1">★☆☆☆☆ Poor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                  Pairing / Cigar Selection
                </label>
                <input
                  type="text"
                  placeholder="e.g. Late Hour Churchill with Highland Park 18"
                  value={loungeForm.pairingOrSelection || ''}
                  onChange={e => setLoungeForm({ ...loungeForm, pairingOrSelection: e.target.value })}
                  className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#5b6672] mb-1">
                  Atmosphere & Tasting Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Leather armchairs, courteous humidor master, excellent ventilation and quiet jazz."
                  value={loungeForm.atmosphereNotes || ''}
                  onChange={e => setLoungeForm({ ...loungeForm, atmosphereNotes: e.target.value })}
                  className="w-full text-sm p-2 border border-[#c7bb98] rounded bg-[#f4efe2] text-[#1c2530]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="membersOnly"
                  checked={!!loungeForm.isPrivateOrMembersClub}
                  onChange={e => setLoungeForm({ ...loungeForm, isPrivateOrMembersClub: e.target.checked })}
                  className="rounded border-[#c7bb98] text-[#1c2530]"
                />
                <label htmlFor="membersOnly" className="text-xs font-mono text-[#1c2530]">
                  Private Club / Reservations Required
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#d5cbac]">
                <button
                  type="button"
                  onClick={() => setIsLoungeModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#5b6672] hover:bg-[#eae4d3] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-[#1c2530] text-[#f4efe2] rounded hover:bg-[#37455a] font-bold"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
