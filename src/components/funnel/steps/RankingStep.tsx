'use client';

import type { RankingStep } from '@/types/funnel';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useFunnel } from '../FunnelContext';

interface Props {
  step: RankingStep;
}

function SortableItem({
  id,
  label,
  rank,
}: {
  id: string;
  label: string;
  rank: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-2xl p-4 transition-shadow ${
        isDragging ? 'shadow-xl ring-2 ring-[var(--funnel-primary)]' : 'shadow-sm'
      }`}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-roledescription="sortable item"
      aria-label={`Rank ${rank}: ${label}`}
    >
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{
          backgroundColor: 'var(--funnel-primary)',
          color: 'var(--funnel-text-on-primary, #ffffff)',
        }}
      >
        {rank}
      </div>

      <div
        className="flex-1 text-sm font-medium leading-snug"
        style={{ color: 'var(--funnel-text-primary)' }}
      >
        {label}
      </div>

      {/* Drag handle */}
      <div
        className="flex-shrink-0 touch-none"
        style={{ color: 'var(--funnel-text-secondary)' }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="7" cy="4" r="1.5" />
          <circle cx="13" cy="4" r="1.5" />
          <circle cx="7" cy="10" r="1.5" />
          <circle cx="13" cy="10" r="1.5" />
          <circle cx="7" cy="16" r="1.5" />
          <circle cx="13" cy="16" r="1.5" />
        </svg>
      </div>
    </div>
  );
}

export function RankingStepComponent({ step }: Props) {
  const { goNext, setResponse, getResponse } = useFunnel();
  const existing = getResponse(step.id) as string[] | undefined;

  const [items, setItems] = useState<string[]>(() => {
    if (existing && Array.isArray(existing)) return existing;
    return step.options.map((o) => o.id);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const labelMap = Object.fromEntries(step.options.map((o) => [o.id, o.label]));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  function handleContinue() {
    setResponse(step.id, items);
    goNext();
  }

  return (
    <div className="flex flex-col px-4 py-8">
      <motion.h2
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-2 text-center text-2xl font-bold"
        style={{ color: 'var(--funnel-text-primary)' }}
      >
        {step.question}
      </motion.h2>

      {step.description && (
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4 text-center text-sm"
          style={{ color: 'var(--funnel-text-secondary)' }}
        >
          {step.description}
        </motion.p>
      )}

      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-5 text-center text-xs font-medium uppercase tracking-wider"
        style={{ color: 'var(--funnel-text-secondary)', opacity: 0.7 }}
      >
        Drag to reorder
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
        style={{ backgroundColor: 'var(--funnel-surface)', borderRadius: '16px', padding: '8px' }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map((id, index) => (
              <SortableItem
                key={id}
                id={id}
                label={labelMap[id] ?? id}
                rank={index + 1}
              />
            ))}
          </SortableContext>
        </DndContext>
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleContinue}
        className="mx-auto mt-8 rounded-full px-12 py-4 text-lg font-semibold shadow-lg"
        style={{
          backgroundColor: 'var(--funnel-primary)',
          color: 'var(--funnel-text-on-primary, #ffffff)',
          boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
        }}
      >
        Continue
      </motion.button>
    </div>
  );
}
