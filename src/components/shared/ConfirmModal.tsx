// src/components/shared/ConfirmModal.tsx

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const ConfirmModal = React.forwardRef<HTMLDivElement, ConfirmModalProps>(
  (
    {
      open,
      onOpenChange,
      title,
      message,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      variant = 'default',
      onConfirm,
      onCancel,
      isLoading = false,
    },
    ref
  ) => {
    const [isProcessing, setIsProcessing] = React.useState(false);

    const handleConfirm = async () => {
      setIsProcessing(true);
      try {
        await onConfirm();
        onOpenChange(false);
      } catch (error) {
        console.error('Error in confirm action:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    const handleCancel = () => {
      if (onCancel) {
        onCancel();
      }
      onOpenChange(false);
    };

    const loading = isLoading || isProcessing;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent ref={ref} className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {variant === 'destructive' && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              )}
              <DialogTitle>{title}</DialogTitle>
            </div>
            <DialogDescription className="mt-2 text-left">
              {message}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);
ConfirmModal.displayName = 'ConfirmModal';