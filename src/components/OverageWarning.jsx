import React from 'react';
import { formatNaira } from '../lib/format';
import Modal from './Modal';

export default function OverageWarning({ isOpen, onClose, onConfirm, data }) {
  if (!data) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Budget Warning">
      <div className="warning-card">
        <p className="warning-title">This would go over {data.person}'s budget</p>
        <p className="warning-body">
          {formatNaira(data.alreadyGiven)} already given + {formatNaira(data.parsed)} now 
          would put you {formatNaira(data.over)} over the {formatNaira(data.cap)} budget.
        </p>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Go back</button>
        <button className="btn btn-warning" onClick={onConfirm}>Give anyway</button>
      </div>
    </Modal>
  );
}