import React, { useState, useCallback } from 'react';
import type { SocialPost } from '../types';
import { PlatformName } from '../types';
import { CopyIcon, CheckIcon, RefreshCwIcon, SparklesIcon } from './Icons';

interface SocialPostCardProps {
  post: SocialPost;
  onRefine: (platformName: PlatformName, instruction: string) => Promise<void>;
  isRefining: boolean;
  onSwapImage: (platformName: PlatformName) => Promise<void>;
  isSwapping: boolean;
}

const SocialPostCard: React.FC<SocialPostCardProps> = ({ post, onRefine, isRefining, onSwapImage, isSwapping }) => {
  const [copied, setCopied] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(post.postText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [post.postText]);

  const handleRefineClick = useCallback(() => {
    if (!refineInstruction.trim()) return;
    onRefine(post.platform.name, refineInstruction).then(() => {
        setRefineInstruction('');
    });
  }, [refineInstruction, post.platform.name, onRefine]);

  const handleSwapImageClick = useCallback(() => {
    onSwapImage(post.platform.name);
  }, [post.platform.name, onSwapImage]);

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700/50 transition-all duration-300 hover:shadow-purple-500/10 hover:border-slate-700">
      <div className="p-4 flex items-center justify-between bg-slate-900/50 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <post.platform.Icon className="w-6 h-6 text-slate-300" />
          <h3 className="font-bold text-xl text-white">{post.platform.name}</h3>
        </div>
        <button
          onClick={handleCopy}
          aria-label={`Copy text for ${post.platform.name}`}
          className={`px-3 py-1.5 text-sm font-semibold rounded-md flex items-center space-x-2 transition-colors duration-200 ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
          <span>{copied ? 'Copied!' : 'Copy Caption'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        <div className="relative">
          {post.imageUrl ? (
            <>
              <img 
                src={post.imageUrl} 
                alt={`Generated for ${post.platform.name}`} 
                className="w-full h-full object-cover rounded-lg bg-slate-700" 
              />
              {isSwapping && (
                 <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center rounded-lg">
                    <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-white"></div>
                 </div>
              )}
               <span className="absolute bottom-2 left-2 px-2 py-1 text-xs font-semibold bg-slate-900/70 text-white rounded-md backdrop-blur-sm">
                  {post.isAiImage ? 'AI Generated' : 'Stock Photo'}
               </span>
               <button
                  onClick={handleSwapImageClick}
                  disabled={isSwapping}
                  className="absolute bottom-2 right-2 flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-900/70 text-white rounded-md backdrop-blur-sm hover:bg-slate-900 transition-all duration-200 disabled:opacity-50"
                >
                  <RefreshCwIcon className={`w-3 h-3 ${isSwapping ? 'animate-spin' : ''}`} />
                  <span>Swap Image</span>
                </button>
            </>
          ) : (
             <div className="prose prose-invert prose-sm text-slate-300 h-full overflow-y-auto p-4 bg-slate-900/30 rounded-md">
                <h4 className="font-bold text-slate-100">Video Concept</h4>
                
                <h5 className="font-semibold text-slate-200 mt-4">Script/Storyboard:</h5>
                {post.script?.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                ))}

                <h5 className="font-semibold text-slate-200 mt-4">Video Prompt:</h5>
                <p className="text-slate-400 italic">"{post.videoPrompt}"</p>
            </div>
          )}
        </div>
        <div className="prose prose-invert prose-sm text-slate-300 max-h-60 md:max-h-full overflow-y-auto p-3 bg-slate-900/30 rounded-md">
            <h4 className="font-bold text-slate-100 mb-2">Caption</h4>
            {post.postText.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
            ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Refine this post</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={refineInstruction}
            onChange={(e) => setRefineInstruction(e.target.value)}
            placeholder="e.g., Make it more engaging with a question."
            className="w-full p-2 text-sm bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:opacity-50"
            rows={1}
            disabled={isRefining}
          />
          <button
            onClick={handleRefineClick}
            disabled={isRefining || !refineInstruction.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isRefining ? 'animate-spin' : ''}`} />
            <span>{isRefining ? 'Refining...' : 'Refine'}</span>
          </button>
        </div>
      </div>

      {post.proTip && (
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-start space-x-3">
            <SparklesIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-sm font-semibold text-slate-300">Pro Tip</h4>
              <p className="text-sm text-slate-400 mt-1">{post.proTip}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialPostCard;
