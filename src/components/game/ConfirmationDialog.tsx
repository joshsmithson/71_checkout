import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  CircularProgress
} from '@mui/material';
import { ReactNode } from 'react';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmText: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'warning';
  confirmIcon?: ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
}

const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  confirmColor = 'primary',
  confirmIcon,
  isLoading = false,
  loadingText,
  disabled = false
}: ConfirmationDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof message === 'string' ? (
          <Typography>{message}</Typography>
        ) : (
          message
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={isLoading || disabled}
          startIcon={isLoading ? <CircularProgress size={20} /> : confirmIcon}
        >
          {isLoading ? (loadingText || confirmText) : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
