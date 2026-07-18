import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders a modal in document.body so it is not clipped by overflow containers.
 */
const ModalOverlay = ({ children, onClose, width = '400px' }) => {
  return createPortal(
    <div
      className="app-modal-overlay"
      onClick={onClose ? onClose : undefined}
      role="presentation"
    >
      <div
        className="app-modal-content glass-panel"
        style={{ width, maxHeight: '80vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default ModalOverlay;
