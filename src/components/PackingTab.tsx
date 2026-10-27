import React from 'react';
import { Trip, PackingItem, PACKING_CATEGORIES, PACKING_ESSENTIALS } from '../types';
import { singleLine, uid } from '../utils/helpers';

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
        detail: `Added ${toAdd.length} essential item(s) to ${trip.name} packing list`
      }
    );
    onShowToast(`${toAdd.length} item(s) added`);
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn-primary" onClick={() => onOpenAddPackingModal()}>
          + Add Item
        </button>
        <button className="btn-ghost" onClick={handleQuickAddEssentials}>
          + Quick Add Essentials
        </button>
        {total > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '120px',
                height: '6px',
                borderRadius: '3px',
                background: 'var(--paper-edge)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'var(--green)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--ink-soft)'
              }}
            >
              {packed} / {total} packed
            </span>
          </div>
        )}
      </div>

      <div>
        {PACKING_CATEGORIES.map(c => {
          const items = trip.packingList.filter(i => i.category === c.key);
          const packedCount = items.filter(i => i.packed).length;

          return (
            <div className={`sheet-section ${items.length ? '' : 'is-empty'}`} key={c.key}>
              <div className="sheet-header">
                <div>
                  <span className="sheet-dot" style={{ background: c.color }} />
                  {c.key}{' '}
                  <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    ({packedCount}/{items.length})
                  </span>
                </div>
                <button className="btn-ghost btn-sm" onClick={() => onOpenAddPackingModal(c.key)}>
                  + Add
                </button>
              </div>

              {items.length > 0 ? (
                <div className="table-scroll">
                  <table className="exp-table packing-table">
                    <thead>
                      <tr>
                        <th style={{ width: '8%' }}></th>
                        <th style={{ width: '66%' }}>Item</th>
                        <th style={{ width: '14%' }} className="num">Qty</th>
                        <th style={{ width: '12%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id} className={item.packed ? 'packed-row' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={item.packed}
                              onChange={() => handleTogglePacked(item)}
                              aria-label="Mark packed"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="pack-name"
                              value={item.name}
                              onChange={e => handleItemChange(item, 'name', e.target.value)}
                            />
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.qty}
                              style={{ textAlign: 'right' }}
                              onChange={e => handleItemChange(item, 'qty', e.target.value)}
                            />
                          </td>
                          <td>
                            <button
                              className="exp-del"
                              onClick={() => handleDeleteItem(item)}
                              title="Delete item"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
