import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { BaseEdge, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { Lock } from 'lucide-react';
import { useStoryStore } from '../store';
import { edgeGeometry, getConditions } from '../graph/conditions';
import { getTranslation } from '../i18n/translations';
import { areEdgePropsEqual } from '../graph/edgeComparators';

function getEdgePortSourceY(edge, nodes, edges) {
  if (Number.isFinite(edge?.sourceY)) return Number(edge.sourceY);
  if (Number.isFinite(edge?.data?.sourceY)) return Number(edge.data.sourceY);

  const srcNode = (nodes || []).find((n) => n.id === edge.source);
  const baseY = Number.isFinite(srcNode?.position?.y) ? srcNode.position.y : 0;

  const existingChoices = Array.isArray(srcNode?.data?.choices) ? srcNode.data.choices : [];
  const connectedChoices = (edges || [])
    .filter((ed) => ed.source === edge.source)
    .map((ed) => ({ id: ed.sourceHandle || ed.data?.choiceId }));

  const orderedChoiceIds = [];
  [...existingChoices, ...connectedChoices].forEach((ch) => {
    if (ch?.id && !orderedChoiceIds.includes(ch.id)) {
      orderedChoiceIds.push(ch.id);
    }
  });

  const handleId = edge.sourceHandle || edge.data?.choiceId;
  const choiceIndex = orderedChoiceIds.indexOf(handleId);
  if (choiceIndex >= 0) {
    return baseY + 54 + choiceIndex * 28;
  }

  const outgoingFromSource = (edges || []).filter((ed) => ed.source === edge.source);
  const fallbackIndex = outgoingFromSource.findIndex((ed) => ed.id === edge.id);
  return baseY + 54 + Math.max(0, fallbackIndex) * 28;
}

const StoryCustomEdge = memo(function StoryCustomEdge(props) {
  const updateEdgeOffset = useStoryStore((s) => s.updateEdgeOffset);
  const variables = useStoryStore((s) => s.variables);
  const language = useStoryStore((s) => s.language || 'ru');
  const t = getTranslation(language);

  const parallelSpec = useStoryStore(
    useCallback(
      (s) => {
        const allEdges = s.edges || [];
        let matchCount = 0;
        for (let i = 0; i < allEdges.length; i++) {
          const e = allEdges[i];
          if (
            (e.source === props.source && e.target === props.target) ||
            (e.source === props.target && e.target === props.source)
          ) {
            matchCount++;
          }
        }
        if (matchCount <= 1) return '0:140';

        const siblings = allEdges
          .filter(
            (e) =>
              (e.source === props.source && e.target === props.target) ||
              (e.source === props.target && e.target === props.source)
          )
          .sort((a, b) => {
            const syA = getEdgePortSourceY(a, s.nodes, allEdges);
            const syB = getEdgePortSourceY(b, s.nodes, allEdges);
            if (syA !== syB) return syA - syB;
            return allEdges.indexOf(a) - allEdges.indexOf(b);
          });

        const lane =
          siblings.length > 1
            ? siblings.findIndex((e) => e.id === props.id) - (siblings.length - 1) / 2
            : 0;
        const spacing =
          140 +
          Math.ceil(Math.max(0, ...siblings.map((e) => getConditions(e.data).length)) / 2) * 34;
        return `${lane}:${spacing}`;
      },
      [props.id, props.source, props.target]
    )
  );

  const [laneStr, spacingStr] = String(parallelSpec || '0:140').split(':');
  const lane = Number(laneStr) || 0;
  const spacing = Number(spacingStr) || 140;

  const { getZoom } = useReactFlow();
  const [dragOffset, setDragOffset] = useState(null);
  const didDragRef = useRef(false);
  const dragCleanupRef = useRef(null);

  useEffect(() => {
    return () => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
        dragCleanupRef.current = null;
      }
    };
  }, []);

  const storedOffset = props.data?.customOffset || null;
  const activeOffset = dragOffset !== null ? dragOffset : storedOffset;

  const geometry = edgeGeometry(
    { ...props, customOffset: activeOffset },
    lane,
    spacing
  );

  const conditions = getConditions(props.data);
  const text = String(props.label || '').replace(/\s*\[[^\]]*\]/g, '').trim();
  const legacyBadges = conditions.length
    ? []
    : [...String(props.label || '').matchAll(/\[\s*(?:[^\w\sА-Яа-яЁё]+\s*)?([^\]]*)\]/g)].map((m) => m[1].trim()).filter(Boolean);

  const handleLabelMouseDown = useCallback(
    (event) => {
      if (event.button !== 0) return;
      event.stopPropagation();

      if (dragCleanupRef.current) {
        dragCleanupRef.current();
        dragCleanupRef.current = null;
      }

      const zoom = typeof getZoom === 'function' ? getZoom() || 1 : 1;
      const startX = event.clientX;
      const startY = event.clientY;
      const baseOffsetX = Number(activeOffset?.x) || 0;
      const baseOffsetY = Number(activeOffset?.y) || 0;

      didDragRef.current = false;
      let latestOffset = activeOffset;

      const onMouseMove = (moveEvent) => {
        const rawDx = moveEvent.clientX - startX;
        const rawDy = moveEvent.clientY - startY;
        if (!didDragRef.current && Math.hypot(rawDx, rawDy) < 4) return;
        didDragRef.current = true;
        latestOffset = {
          x: Math.round(baseOffsetX + rawDx / zoom),
          y: Math.round(baseOffsetY + rawDy / zoom)
        };
        setDragOffset(latestOffset);
      };

      const cleanupListeners = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      const onMouseUp = () => {
        cleanupListeners();
        dragCleanupRef.current = null;
        if (didDragRef.current && latestOffset) {
          updateEdgeOffset?.(props.id, latestOffset);
        }
        setDragOffset(null);
      };

      dragCleanupRef.current = cleanupListeners;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [activeOffset, getZoom, props.id, updateEdgeOffset]
  );

  const handleLabelDoubleClick = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();
      setDragOffset(null);
      updateEdgeOffset?.(props.id, null);
    },
    [props.id, updateEdgeOffset]
  );

  return (
    <>
      <BaseEdge
        id={props.id}
        path={geometry.path}
        markerEnd={props.markerEnd}
        interactionWidth={24}
        style={{
          ...props.style,
          stroke: props.selected
            ? '#2563eb'
            : conditions.length
            ? '#f59e0b'
            : 'var(--dots-color)',
          strokeWidth: props.selected ? 2.8 : 2.2
        }}
      />
      {(text || conditions.length > 0 || legacyBadges.length > 0) && (
        <EdgeLabelRenderer>
          <div
            className="sa-edge-label-wrap nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${geometry.x}px, ${geometry.y}px)`,
              zIndex: 100,
              pointerEvents: 'all'
            }}
          >
            <div
              className="edge-label-pill nodrag nopan"
              onMouseDown={handleLabelMouseDown}
              onDoubleClick={handleLabelDoubleClick}
              onClick={(e) => {
                if (didDragRef.current) {
                  e.stopPropagation();
                  didDragRef.current = false;
                }
              }}
              title={t.edgeModal.edgeDragTooltip}
              style={{
                cursor: dragOffset ? 'grabbing' : 'grab',
                userSelect: 'none',
                zIndex: 100,
                pointerEvents: 'all',
                borderColor: activeOffset ? '#3b82f6' : undefined
              }}
            >
              {text && <span>{text}</span>}
              {(conditions.length > 0 || legacyBadges.length > 0) && (
                <div className="condition-chips">
                  {conditions.map((c, i) => (
                    <span
                      className="condition-chip"
                      key={`${c.varId}-${i}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                    >
                      {i > 0 && <b>{c.logicalOp} </b>}
                      <Lock size={10} color="#f59e0b" />
                      <span>
                        {variables.find((v) => v.id === c.varId)?.name || c.varId} {c.operator}{' '}
                        {String(c.value)}
                      </span>
                    </span>
                  ))}
                  {legacyBadges.map((badge, i) => (
                    <span
                      className="condition-chip"
                      key={i}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                    >
                      <Lock size={10} color="#f59e0b" />
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}, areEdgePropsEqual);

export default StoryCustomEdge;
