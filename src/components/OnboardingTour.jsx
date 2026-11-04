import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { useStoryStore } from '../store';
import { getTranslation } from '../i18n/translations';
import { markTourAsSeen } from '../utils/onboarding';

export default function OnboardingTour({ isOpen, onClose }) {
  const language = useStoryStore((s) => s.language || 'ru');
  const t = getTranslation(language);
  const steps = t.tour.steps;

  const [stepIndex, setStepIndex] = useState(0);

  const activeStep = steps[Math.min(stepIndex, steps.length - 1)] || steps[0];

  const handleFinishOrSkip = () => {
    markTourAsSeen();
    setStepIndex(0);
    if (onClose) onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const finishOrSkip = () => {
      markTourAsSeen();
      setStepIndex(0);
      if (onClose) onClose();
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        finishOrSkip();
      } else if (e.key === 'ArrowRight') {
        setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft') {
        setStepIndex((prev) => (prev > 0 ? prev - 1 : prev));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, steps.length]);

  if (!isOpen) return null;

  const isLastStep = stepIndex >= steps.length - 1;

  return (
    <aside
      className="sa-onboarding-floating-guide sa-modal-card"
      role="dialog"
      aria-modal="false"
      aria-label={activeStep.title}
      style={styles.floatingCard}
    >
      <div style={styles.headerRow}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={styles.stepBadge}>
            <Sparkles size={13} />
            {t.tour.badge(stepIndex + 1, steps.length)}
          </span>
          {t.tour.stepLabel && (
            <span style={{ fontSize: '0.75rem', opacity: 0.72, fontWeight: 600 }}>
              {t.tour.stepLabel(stepIndex + 1, steps.length)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleFinishOrSkip}
          style={styles.closeTourBtn}
          title={t.tour.closeTour || t.tour.skip}
        >
          <X size={14} />
          <span>{t.tour.closeTour || 'Закрыть обучение'}</span>
        </button>
      </div>

      <h3 style={styles.title}>{activeStep.title}</h3>
      <p style={styles.description}>{activeStep.description}</p>

      {/* Индикаторы прогресса по 5 шагам */}
      <div style={styles.dotsRow}>
        {steps.map((st, idx) => (
          <button
            key={st.id}
            type="button"
            onClick={() => setStepIndex(idx)}
            aria-label={`${idx + 1}: ${st.title}`}
            style={{
              ...styles.dot,
              width: idx === stepIndex ? 24 : 8,
              background: idx === stepIndex ? '#3b82f6' : 'rgba(148, 163, 184, 0.35)'
            }}
          />
        ))}
      </div>

      <div style={styles.footerRow}>
        <div>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              style={styles.secondaryBtn}
            >
              <ChevronLeft size={15} />
              <span>{t.tour.back}</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (isLastStep) {
              handleFinishOrSkip();
            } else {
              setStepIndex((i) => i + 1);
            }
          }}
          style={styles.primaryBtn}
        >
          <span>{isLastStep ? t.tour.finish : t.tour.next}</span>
          {isLastStep ? <Check size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>
    </aside>
  );
}

const styles = {
  floatingCard: {
    position: 'fixed',
    right: 20,
    bottom: 20,
    zIndex: 3600,
    pointerEvents: 'auto',
    width: 'min(390px, calc(100vw - 32px))',
    padding: '16px 18px',
    borderRadius: 16,
    background: 'var(--panel-bg, rgba(15, 23, 42, 0.96))',
    color: 'var(--text-color, #f8fafc)',
    border: '1.5px solid rgba(59, 130, 246, 0.55)',
    boxShadow: '0 20px 48px rgba(0, 0, 0, 0.52), 0 0 24px rgba(59, 130, 246, 0.18)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  stepBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 999,
    background: 'rgba(37, 99, 235, 0.2)',
    color: '#60a5fa',
    fontSize: '0.76rem',
    fontWeight: 800,
    letterSpacing: '0.03em'
  },
  closeTourBtn: {
    height: 32,
    boxSizing: 'border-box',
    padding: '0 10px',
    borderRadius: 8,
    border: '1px solid rgba(239, 68, 68, 0.35)',
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#f87171',
    fontSize: '0.76rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '1.02rem',
    fontWeight: 800
  },
  description: {
    margin: '0 0 14px 0',
    fontSize: '0.84rem',
    lineHeight: 1.45,
    opacity: 0.9
  },
  dotsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14
  },
  dot: {
    height: 8,
    padding: 0,
    borderRadius: 999,
    border: 'none',
    cursor: 'pointer',
    transition: 'width 0.25s ease, background 0.25s ease'
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  secondaryBtn: {
    height: 36,
    boxSizing: 'border-box',
    padding: '0 12px',
    borderRadius: 8,
    border: '1px solid var(--panel-border, #334155)',
    background: 'var(--bg-color, #0f172a)',
    color: 'var(--text-color, #f8fafc)',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4
  },
  primaryBtn: {
    height: 36,
    boxSizing: 'border-box',
    padding: '0 16px',
    borderRadius: 8,
    border: 'none',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '0.84rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    boxShadow: '0 6px 16px rgba(37, 99, 235, 0.35)'
  }
};
