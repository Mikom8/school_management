import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, show, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="notification-container-fixed">
      <div className="notification-item success">
        <div className="notification-content">
          <div className="notification-icon">
            <CheckCircle size={20} />
          </div>
          <div className="notification-text">{message}</div>
        </div>
        <div 
          className="notification-icon notification-close" 
          onClick={onClose}
          style={{ cursor: 'pointer' }}
        >
          <X size={16} />
        </div>
        <div className="notification-progress-bar"></div>
      </div>
    </div>
  );
};

export default Toast;
