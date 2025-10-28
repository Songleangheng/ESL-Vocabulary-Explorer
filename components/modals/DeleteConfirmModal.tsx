
import React from 'react';
import { Modal } from '../ui/Modal';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    termsToDelete: string[];
    onConfirmDelete: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, termsToDelete, onConfirmDelete }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirm Deletion" maxWidth="max-w-md">
            <div className="text-center">
                <p className="text-slate-600 mb-6">{`Are you sure you want to delete ${termsToDelete.length} term(s)? This action cannot be undone.`}</p>
                <div className="flex justify-center gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirmDelete} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors">
                        Yes, Delete
                    </button>
                </div>
            </div>
        </Modal>
    );
};
