import React from 'react';
import './LoadingDots.css';

interface LoadingDotsProps {
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingDots: React.FC<LoadingDotsProps> = ({
  color = 'currentColor',
  size = 'medium'
}) => {
  const getSize = () => {
    switch (size) {
      case 'small': return 'loading-dots-small';
      case 'large': return 'loading-dots-large';
      default: return 'loading-dots-medium';
    }
  };

  return (
    <div className={`loading-dots ${getSize()}`} style={{ color }}>
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
};

export default LoadingDots;
