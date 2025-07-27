import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemType?: string;
  itemName?: string;
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  description,
  itemType = 'item',
  itemName = 'this item'
}) => {
  const [step, setStep] = useState<'first' | 'second'>('first');

  const handleClose = () => {
    setStep('first');
    onClose();
  };

  const handleFirstConfirm = () => {
    setStep('second');
  };

  const handleFinalConfirm = () => {
    setStep('first');
    onConfirm();
    onClose();
  };

  const displayDescription = description || `Are you sure you want to delete the ${itemType.toLowerCase()} "${itemName}"?`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            {step === 'first' ? title : 'Final Confirmation'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {step === 'first' ? (
            <div className="space-y-3">
              <p className="text-gray-700">
                {displayDescription}
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm font-medium">
                  ⚠️ Warning: This action cannot be undone.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-700 font-medium">
                Are you absolutely certain?
              </p>
              <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                <p className="text-red-800 text-sm font-bold">
                  🚨 This action cannot be undone!
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          {step === 'first' ? (
            <Button
              onClick={handleFirstConfirm}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Yes, I'm Sure
            </Button>
          ) : (
            <Button
              onClick={handleFinalConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Delete Forever
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDeleteDialog;
export { ConfirmDeleteDialog };