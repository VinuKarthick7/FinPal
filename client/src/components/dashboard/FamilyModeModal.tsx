import React from 'react';
import { X } from 'lucide-react';
import FamilyMode from './FamilyMode';

interface FamilyModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FamilyModeModal: React.FC<FamilyModeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300">
        {/* Close Button */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 p-4 flex justify-between items-center rounded-t-3xl z-10">
          <h2 className="text-xl font-bold text-gray-900">Family Mode</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <FamilyMode />
        </div>
      </div>
    </div>
  );
};

export default FamilyModeModal;
