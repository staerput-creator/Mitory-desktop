import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Flag, RotateCcw, X, Lock, MapPin, ArrowRight } from 'lucide-react';
import { useStoryStore, assetStorage } from '../store';
import { evaluateConditions, getConditions } from '../graph/conditions';
import './StoryPlayer.css';

export default function StoryPlayer({ onClose, initialNodeId = null }) {
  const { nodes, edges, characters, variables } = useStoryStore();
  const [currentVars, setCurrentVars] = useState({});
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);

  const applyEffects = useCallback(
    (effects = [], current) => {
      const next = { ...current };
      for (const effect of effects) {
        const variable = variables.find((item) => item.id === effect.varId);
        if (!variable) continue;
        if (variable.type === 'boolean') {
          next[variable.id] =
            effect.action === 'toggle'
              ? !next[variable.id]
              : effect.value === true || effect.value === 'true';
        } else {
          const value = Number.isFinite(Number(effect.value)) ? Number(effect.value) : 0;
          const currentValue = Number.isFinite(Number(next[variable.id])) ? Number(next[variable.id]) : 0;
          next[variable.id] =
            effect.action === 'add'
              ? currentValue + value
              : effect.action === 'sub'
              ? currentValue - value
              : value;
        }
      }
      return next;
    },
    [variables]
  );

  const storyNodes = useMemo(
    () => (nodes || []).filter((n) => n.type !== 'regionNode'),
    [nodes]
  );

  const restart = useCallback(() => {
    const initial = Object.fromEntries(
      variables.map((variable) => [variable.id, variable.initialValue])
    );
    const start =
      (initialNodeId && storyNodes.find((n) => n.id === initialNodeId)) ||
      storyNodes.find((node) => node.data?.type === 'start') ||
      storyNodes[0];
    setDialogueIndex(0);
    if (!start) {
      setCurrentNodeId(null);
      setCurrentVars(initial);
      return;
    }
    setCurrentVars(applyEffects(start.data?.effects, initial));
    setCurrentNodeId(start.id);
  }, [applyEffects, initialNodeId, storyNodes, variables]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) restart();
    });
    return () => {
      active = false;
    };
  }, [restart]);

  const currentNode = storyNodes.find((node) => node.id === currentNodeId);
  const dialogue = Array.isArray(currentNode?.data?.dialogue)
    ? currentNode.data.dialogue
    : [];
  const outgoing = edges.filter(
    (edge) =>
      edge.source === currentNodeId && currentNode?.data?.type !== 'ending'
  );
  const dialogueLength = dialogue.length;
  const currentLine = dialogue[dialogueIndex];
  const dialogueComplete = !currentLine;
  const displayedLine =
    currentLine || (dialogueLength > 0 ? dialogue[dialogueLength - 1] : null);

  const background = currentNode?.data?.imageId
    ? assetStorage.getAsset(currentNode.data.imageId)
    : currentNode?.data?.image || null;

  const getConditionStatus = useCallback(
    (edge) => {
      const conditions = getConditions(edge.data);
      const checks = conditions.map((condition) => {
        const variable = variables.find((item) => item.id === condition.varId);
        if (!variable) {
          return {
            ok: false,
            reason: `Неизвестная переменная: ${condition.varId}`
          };
        }
        const current = currentVars[variable.id];
        const target = condition.value;
        const operator = condition.operator || '==';
        if (variable.type === 'boolean') {
          const expected = target === true || target === 'true';
          return {
            ok:
              operator === '!='
                ? Boolean(current) !== expected
                : Boolean(current) === expected,
            reason: `${variable.name} ${operator} ${expected ? 'Есть' : 'Нет'}`
          };
        }
        const left = Number(current ?? 0);
        const right = Number(target ?? 0);
        const ok =
          operator === '=='
            ? left === right
            : operator === '!='
            ? left !== right
            : operator === '>='
            ? left >= right
            : operator === '>'
            ? left > right
            : operator === '<='
            ? left <= right
            : left < right;
        return { ok, reason: `${variable.name} ${operator} ${right}` };
      });
      return {
        ok: evaluateConditions(conditions, (condition) => {
          const index = conditions.indexOf(condition);
          return checks[index]?.ok ?? true;
        }),
        reasons: checks.filter((check) => check.reason).map((check) => check.reason)
      };
    },
    [currentVars, variables]
  );

  const choices = useMemo(
    () => outgoing.map((edge) => ({ edge, ...getConditionStatus(edge) })),
    [getConditionStatus, outgoing]
  );

  const advanceDialogue = useCallback(() => {
    if (dialogueIndex < dialogueLength) {
      setDialogueIndex((index) => index + 1);
    }
  }, [dialogueLength, dialogueIndex]);

  const choose = useCallback(
    (edge) => {
      const target = storyNodes.find((node) => node.id === edge.target);
      if (
        !dialogueComplete ||
        edge.source !== currentNodeId ||
        !target ||
        !getConditionStatus(edge).ok
      ) {
        return;
      }
      const afterEdge = applyEffects(edge.data?.effects, currentVars);
      setCurrentVars(applyEffects(target.data?.effects, afterEdge));
      setCurrentNodeId(target.id);
      setDialogueIndex(0);
    },
    [
      applyEffects,
      currentNodeId,
      currentVars,
      dialogueComplete,
      getConditionStatus,
      storyNodes
    ]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      ) {
        return;
      }
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('button') &&
        (event.code === 'Space' || event.key === 'Enter')
      ) {
        return;
      }
      if (event.code === 'Space' || event.key === 'Enter') {
        event.preventDefault();
        if (dialogueComplete) return;
        advanceDialogue();
        return;
      }
      if (dialogueComplete && /^[1-9]$/.test(event.key)) {
        const choice = choices[Number(event.key) - 1];
        if (choice?.ok) choose(choice.edge);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceDialogue, choose, choices, dialogueComplete, onClose]);

  const activeSpeaker =
    displayedLine &&
    characters.find((item) => item.id === displayedLine.charId);
  const speakerColor = activeSpeaker?.color || '#3b82f6';
  const speakerName = activeSpeaker?.name || 'Рассказчик';
  const finalScene =
    currentNode &&
    (currentNode.data?.type === 'ending' || outgoing.length === 0);

  return (
    <div
      className="vn-player"
      role="dialog"
      aria-modal="true"
      aria-label="Плеер истории"
    >
      {background ? (
        <img
          src={background}
          alt={currentNode?.data?.label || 'Фон сцены'}
          className="vn-bg-media"
        />
      ) : (
        <div className="vn-bg-fallback" />
      )}
      <div className="vn-vignette" />

      {/* Минималистичный HUD */}
      <header className="vn-hud">
        <div className="vn-hud-left">
          <button type="button" className="vn-exit-btn" onClick={onClose}>
            <X size={16} />
            <span>Выйти в редактор</span>
          </button>
        </div>

        <div className="vn-stats">
          {variables.map((variable) => {
            const value = currentVars[variable.id] ?? variable.initialValue;
            return (
              <span className="vn-stat-chip" key={variable.id}>
                <b>{variable.name}:</b>{' '}
                {variable.type === 'boolean' ? (value ? 'Есть' : 'Нет') : value}
              </span>
            );
          })}
        </div>
      </header>

      {/* Нижняя сцена Visual Novel: Выборы -> Компактный маркер локации -> Диалоговый бокс */}
      <div className="vn-stage-bottom">
        {/* Карточки вариантов появляются над диалоговым боксом только после завершения всех реплик сцены */}
        {dialogueComplete && outgoing.length > 0 && (
          <div className="vn-choices" key={`choices-${currentNodeId}`}>
            {choices.map(({ edge, ok, reasons }, index) => {
              const cleanLabel =
                String(edge.label || '')
                  .replace(/\s*\[[^\]]*\]/g, '')
                  .trim() || 'Далее';
              return (
                <button
                  type="button"
                  className="vn-choice-card"
                  key={edge.id}
                  disabled={!ok}
                  onClick={() => choose(edge)}
                >
                  <span>
                    <span className="vn-choice-key">[{index + 1}]</span>
                    {cleanLabel}
                  </span>
                  {reasons.length > 0 ? (
                    <span className="vn-choice-req-locked" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Lock size={12} />
                      <span>Требуется: {reasons.join(' · ')}</span>
                    </span>
                  ) : (
                    <span className="vn-choice-req-ok">
                      <CheckCircle2 size={16} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {dialogueComplete && finalScene && (
          <div className="vn-final-banner">
            <div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  color: '#fbbf24'
                }}
              >
                <Flag size={18} color="#fbbf24" /> Финал истории
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.88rem', marginTop: 4 }}>
                {currentNode?.data?.notes || 'Эта сюжетная ветка завершена.'}
              </div>
            </div>
            <button type="button" className="vn-next-btn" onClick={restart}>
              <RotateCcw size={15} /> Пройти заново
            </button>
          </div>
        )}

        {/* Компактный маркер локации в углу над диалогом */}
        {currentNode && (
          <div className="vn-location-row">
            <div className="vn-location-badge">
              <MapPin size={14} color="#60a5fa" />
              <span>{currentNode.data?.label || 'Локация'}</span>
            </div>
            {currentNode.data?.type === 'ending' && (
              <div className="vn-ending-pill">
                <Flag size={13} /> Финал
              </div>
            )}
          </div>
        )}

        {/* Нижний диалоговый бокс (Visual Novel Box) */}
        {!currentNode ? (
          <div className="vn-dialogue-box">
            <div className="vn-dialogue-text">На полотне пока нет сцен.</div>
          </div>
        ) : (
          <div
            className="vn-dialogue-box"
            onClick={() => {
              if (!dialogueComplete) advanceDialogue();
            }}
          >
            <div>
              <div
                className="vn-speaker-badge"
                style={{
                  borderLeft: `4px solid ${speakerColor}`,
                  color: speakerColor
                }}
              >
                {displayedLine ? speakerName : 'Описание сцены'}
              </div>
              <div className="vn-dialogue-text">
                {displayedLine
                  ? displayedLine.text || '...'
                  : currentNode.data?.notes || currentNode.data?.label || '...'}
              </div>
            </div>

            <div className="vn-dialogue-footer">
              <span className="vn-step-counter">
                {dialogueLength > 0
                  ? dialogueComplete
                    ? `Реплики завершены (${dialogueLength}/${dialogueLength})`
                    : `Реплика ${dialogueIndex + 1} из ${dialogueLength} • Нажмите Пробел / Enter`
                  : 'Выберите дальнейшее действие'}
              </span>

              {!dialogueComplete && (
                <button
                  type="button"
                  className="vn-next-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    advanceDialogue();
                  }}
                >
                  <span>Далее</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
