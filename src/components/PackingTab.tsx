import React from 'react';
import { Trip, PackingItem, PACKING_CATEGORIES, PACKING_ESSENTIALS } from '../types';
import { singleLine, uid } from '../utils/helpers';
import { SortableList, SortableRow, DragHandle } from './Sortable';

interface PackingTabProps {
  trip: Trip;
  onUpdateTrip: (updated: Trip, logAction?: { action: string; detail: string }) => void;
  onOpenAddPackingModal: (defaultCat?: string) => void;
  onShowToast: (msg: string) => void;
}

export const PackingTab: React.FC<PackingTabProps> = ({
  trip,
  onUpdateTrip,
  onOpenAddPackingModal,
  onShowToast
}) => {
  const total = trip.packingList.length;
  const packed = trip.packingList.filter(p => p.packed).length;
  const pct = total ? Math.round((packed / total) * 100) : 0;

  const handleTogglePacked = (item: PackingItem) => {
    const updated = trip.packingList.map(p => (p.id === item.id ? { ...p, packed: !p.packed } : p));
    onUpdateTrip({
      ...trip,
      packingList: updated,
      updatedAt: Date.now()
    });
  };

  const handleItemChange = (item: PackingItem, field: 'name' | 'qty', value: any) => {
    const updated = trip.packingList.map(p => {
      if (p.id !== item.id) return p;
      if (field === 'name') return { ...p, name: singleLine(value) || p.name };
      if (field === 'qty') return { ...p, qty: Math.max(1, Number(value) || 1) };
      return p;
    });
    onUpdateTrip({
      ...trip,
      packingList: updated,
      updatedAt: Date.now()
    });
  };

  const handleDeleteItem = (item: PackingItem) => {
    const updated = trip.packingList.filter(p => p.id !== item.id);
    onUpdateTrip(
      {
        ...trip,
        packingList: updated,
        updatedAt: Date.now()
      },
      { action: 'packing-item-deleted', detail: `Removed "${item.name}" from ${trip.name} packing list` }
    );
    onShowToast('Item deleted');
  };

  const handleQuickAddEssentials = () => {
    const existingNames = new Set(trip.packingList.map(i => i.name.toLowerCase()));
    const toAdd = PACKING_ESSENTIALS.filter(e => !existingNames.has(e.name.toLowerCase()));
    if (!toAdd.length) {
      onShowToast('Essentials already added');
      return;
    }
    const newItems: PackingItem[] = toAdd.map(e => ({
      id: uid('pack'),
      category: e.category,
      name: e.name,
      qty: e.qty,
      packed: false
    }));
    onUpdateTrip(
      {
        ...trip,
        packingList: [...trip.packingList, ...newItems],
        updatedAt: Date.now()
      },
      {
        action: 'packing-essentials-added',
        detail: `Added ${toAdd.length} essentials to ${trip.name} packing list`
      }
    );
    onShowToast(`Added ${toAdd.length} essentials`);
  };

  const handleReorderCategory = (categoryKey: string, newIds: string[]) => {
    const reordered = newIds
      .map(id => trip.packingList.find(p => p.id === id))
      .filter(Boolean) as PackingItem[];
    const byCat: Record<string, PackingItem[]> = {};
    for (const p of trip.packingList) {
      (byCat[p.category] ||= []).push(p);
    }
    byCat[categoryKey] = reordered;
    const next: PackingItem[] = [];
    for (const c of PACKING_CATEGORIES) {
      if (byCat[c.key]) next.push(...byCat[c.key]);
    }
    for (const [k, list] of Object.entries(byCat)) {
      if (!PACKING_CATEGORIES.some(c => c.key === k)) next.push(...list);
    }
    onUpdateTrip({
      ...trip,
      packingList: next,
      updatedAt: Date.now()
    });
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn-primary" onClick={() => onOpenAddPackingModal()}>
          + Add Item
        </button>
        <button className="btn-ghost" onClick={handleQuickAddEssentials}>
          + Essentials
        </button>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-soft)' }}>
          {packed}/{total} packed ({pct}%)
        </div>
      </div>

      <div>
        {PACKING_CATEGORIES.map(c => {
          const items = trip.packingList.filter(i => i.category === c.key);
          return (
            <div className={`sheet-section ${items.length ? '' : 'is-empty'}`} key={c.key}>
              <div className="sheet-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="sheet-dot" style={{ background: c.color || 'var(--slate)' }} />
                  <strong>{c.key}</strong>
                  <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    ({items.length})
                  </span>
                </div>
                <button className="btn-ghost btn-sm" onClick={() => onOpenAddPackingModal(c.key)}>
                  + Add
                </button>
              </div>

              {items.length > 0 ? (
                <div className="pack-list">
                  <SortableList
                    ids={items.map(i => i.id)}
                    onReorder={(_f, _t, newIds) => handleReorderCategory(c.key, newIds)}
                  >
                    {items.map(item => (
                      <SortableRow
                        key={item.id}
                        id={item.id}
                        className={`pack-row ${item.packed ? 'packed-row' : ''}`}
                      >
                        <DragHandle />
                        <input
                          type="checkbox"
                          checked={item.packed}
                          onChange={() => handleTogglePacked(item)}
                          aria-label="Mark packed"
                        />
                        <input
                          type="text"
                          className="pack-name"
                          value={item.name}
                          onChange={e => handleItemChange(item, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          min={1}
                          step={1}
                          className="pack-qty"
                          value={item.qty}
                          onChange={e => handleItemChange(item, 'qty', e.target.value)}
                        />
                        <button
                          className="exp-del"
                          onClick={() => handleDeleteItem(item)}
                          title="Delete item"
                        >
                          ✕
                        </button>
                      </SortableRow>
                    ))}
                  </SortableList>
                </div>
              ) : (
                <div className="empty-state">Nothing here yet.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
