import React from 'react';

export function MitoryLogo({ size = 16, className = '', style = {} }) {
  return (
    <img
      src="/app-icon.png"
      width={size}
      height={size}
      alt="Mitory"
      className={className}
      style={{
        objectFit: 'contain',
        flexShrink: 0,
        userSelect: 'none',
        pointerEvents: 'none',
        borderRadius: size > 24 ? '8px' : '3px',
        ...style,
      }}
    />
  );
}

export default MitoryLogo;
