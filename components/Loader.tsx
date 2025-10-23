
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-slate-800/50 rounded-lg">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-purple-400"></div>
      <p className="text-slate-300 text-lg">Generating content...</p>
      <p className="text-slate-400 text-sm max-w-sm text-center">
        Our AI is crafting posts and designing images. This might take a moment.
      </p>
    </div>
  );
};

export default Loader;
