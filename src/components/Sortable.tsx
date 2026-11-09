import React, { createContext, useContext, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  MeasuringStrategy
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const HandleCtx = createContext<{
  attributes: Record<string, any>;
  listeners: Record<string, any> | undefined;
} | null>(null);

export function DragHandle({ className = '' }: { className?: string }) {
  const ctx = useContext(HandleCtx);
  if (!ctx) return null;
  return (
    <button
      type="button"
      className={`drag-handle ${className}`.trim()}
      title="Drag to reorder"
      aria-label="Drag to reorder"
      {...ctx.attributes}
      {...ctx.listeners}
      onClick={e => e.stopPropagation()}
    >
      ⣿
    </button>
  );
}

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  as?: 'div' | 'tr';
}

export function SortableRow({
  id,
  children,
  className = '',
  disabled,
  as: Tag = 'div'
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined
  };

  const handleValue = useMemo(
    () => ({ attributes, listeners: disabled ? undefined : listeners }),
    [attributes, listeners, disabled]
  );

  return (
    <HandleCtx.Provider value={handleValue}>
      <Tag
        ref={setNodeRef as any}
        style={style}
        className={`sortable-row ${isDragging ? 'is-dragging' : ''} ${className}`.trim()}
      >
        {children}
      </Tag>
    </HandleCtx.Provider>
  );
}

interface SortableListProps {
  ids: string[];
  onReorder: (fromIndex: number, toIndex: number, newIds: string[]) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SortableList({ ids, onReorder, children, disabled }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(from, to, arrayMove(ids, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export { arrayMove };
