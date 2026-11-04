import React from 'react';
import { Trash2 } from 'lucide-react';

export default function TrashDropZone({
  zoneRef,
  isDragging = false,
  isOver = false,
  draggedCount = 1,
  language = 'ru'
}) {
  const label =
    language === 'en'
      ? isOver
        ? `Release to move to Trash (${draggedCount})`
        : 'Drop here to Trash'
      : isOver
      ? `Отпустите для удаления в корзину (${draggedCount})`
      : 'Перетащите для удаления';

  return (
    <div
      ref={zoneRef}
      className={`sa-trash-dropzone ${isDragging ? 'is-visible' : ''} ${isOver ? 'is-over' : ''}`}
      aria-hidden={!isDragging}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 40,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 20px',
        borderRadius: 999,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: isOver ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
        border: isOver ? '1px solid #fca5a5' : '1px dashed rgba(239, 68, 68, 0.5)',
        color: isOver ? '#ffffff' : '#f87171',
        boxShadow: isOver
          ? '0 0 32px rgba(239, 68, 68, 0.7), 0 8px 24px rgba(0, 0, 0, 0.4)'
          : '0 8px 28px rgba(239, 68, 68, 0.2)',
        opacity: isDragging ? 1 : 0,
        pointerEvents: isDragging ? 'auto' : 'none',
        transform: isDragging ? (isOver ? 'scale(1.1)' : 'scale(1)') : 'scale(0.85)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none'
      }}
    >
      <Trash2
        size={22}
        className={isOver ? 'sa-trash-icon-pulse' : ''}
        style={{ flexShrink: 0 }}
      />
      <span style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}
