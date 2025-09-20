import React from 'react';
import { Compass } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className={`${sizeClasses[size]} text-primary-teal animate-spin`}>
        <Compass className="w-full h-full" />
      </div>
      {text && (
        <p className={`${textSizeClasses[size]} text-medium-gray font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}

export function PageLoader({ text = 'Loading page...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-off-white flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export function ComponentLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="py-12 flex items-center justify-center">
      <LoadingSpinner size="md" text={text} />
    </div>
  );
}