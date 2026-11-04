export function areEdgePropsEqual(prev, next) {
  return (
    prev.id === next.id &&
    prev.source === next.source &&
    prev.target === next.target &&
    prev.sourceX === next.sourceX &&
    prev.sourceY === next.sourceY &&
    prev.targetX === next.targetX &&
    prev.targetY === next.targetY &&
    prev.sourceHandleId === next.sourceHandleId &&
    prev.targetHandleId === next.targetHandleId &&
    prev.label === next.label &&
    prev.selected === next.selected &&
    prev.markerEnd === next.markerEnd &&
    prev.data === next.data &&
    prev.style === next.style
  );
}