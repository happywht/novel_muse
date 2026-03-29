import React from 'react';

export const Loader: React.FC<{ text?: string }> = ({ text = '思考中...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-12 h-12">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-muse-500/30 rounded-full animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-t-muse-400 rounded-full animate-spin"></div>
      </div>
      <p className="text-muse-300 animate-pulse text-sm font-medium">{text}</p>
    </div>
  );
};
