import React from 'react';

interface TrialPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Minimal placeholder popup: free trial is no longer offered.
// We keep the component to avoid breaking existing imports, but it renders nothing.
const TrialPopup: React.FC<TrialPopupProps> = ({ open, onOpenChange }) => {
  // If some parent still toggles this, close immediately to avoid stuck state.
  if (open) {
    onOpenChange(false);
  }
  return null;
};

export default TrialPopup;
