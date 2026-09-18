import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Action">
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
      </div>
    </Modal>
  );
}