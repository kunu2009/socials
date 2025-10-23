import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { generateSocialPosts, generateImage, refinePost, generateProTip } from './services/geminiService';
import { fetchStockImage } from './services/unsplashService';
import { PLATFORMS } from './constants';
import { Tone, PlatformName, SocialPost } from './types';
import SocialPostCard from './components/SocialPostCard';
import Loader from './components/Loader';
import { SparklesIcon, SettingsIcon, CopyIcon, CheckIcon } from './components/Icons';

const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSave: (key: string) => void;
}> = ({ isOpen, onClose, apiKey, onSave }) => {
  const [localApiKey, setLocalApiKey] = useState(apiKey);

  useEffect(() => {
    setLocalApiKey(apiKey);
  }, [apiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localApiKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <p className="text-sm text-slate-400 mt-1">Manage your API keys here.</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300 mb-1">Gemini API Key</label>
            <input
              id="apiKey"
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder="Enter your API Key"
              className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-2">Your key is saved in your browser's local storage and is not sent anywhere else.</p>
          </div>
        </div>
        <div className="p-4 bg-slate-900/50 flex justify-end items-center gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-slate-700 text-slate-300 rounded-md hover:bg-slate-600 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<Tone>(Tone.Professional);
  const [selectedPlatformNames, setSelectedPlatformNames] = useState<Set<PlatformName>>(new Set());
  
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState<Record<PlatformName, boolean>>({});
  const [isSwapping, setIsSwapping] = useState<Record<PlatformName, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  
  const [userApiKey, setUserApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isAiImageMode, setIsAiImageMode] = useState(true);
  const [isAllCopied, setIsAllCopied] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setUserApiKey(savedKey);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setUserApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const selectedPlatforms = useMemo(() => 
    PLATFORMS.filter(p => selectedPlatformNames.has(p.name)), 
    [selectedPlatformNames]
  );

  const handlePlatformToggle = (platformName: PlatformName) => {
    setSelectedPlatformNames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(platformName)) {
        newSet.delete(platformName);
      } else {
        newSet.add(platformName);
      }
      return newSet;
    });
  };

  const handleGeneratePosts = useCallback(async () => {
    if (!topic.trim() || selectedPlatforms.length === 0) {
      setError('Please provide a topic and select at least one platform.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSocialPosts([]);

    try {
      const generatedContent = await generateSocialPosts(topic, tone, selectedPlatforms, userApiKey);
      
      const postsWithDetailsPromises = generatedContent.map(async (post) => {
        const platform = PLATFORMS.find(p => p.name === post.platformName);
        if (!platform) return null;

        const imagePromise = post.imagePrompt 
          ? isAiImageMode
            ? generateImage(post.imagePrompt, platform.aspectRatio, userApiKey).catch(e => {
                console.error(`Failed to generate image for ${platform.name}`, e);
                return undefined;
              })
            : fetchStockImage(`${topic} ${tone}`, platform.aspectRatio).catch(e => {
                console.error(`Failed to fetch stock image for ${platform.name}`, e);
                return undefined;
              })
          : Promise.resolve(undefined);

        const proTipPromise = generateProTip(platform.name, userApiKey);

        const [imageUrl, proTip] = await Promise.all([imagePromise, proTipPromise]);

        return {
          ...post,
          platform,
          imageUrl,
          proTip,
          isAiImage: isAiImageMode,
        };
      });

      const postsWithDetails = (await Promise.all(postsWithDetailsPromises))
        // FIX: Use a more accurate type predicate to avoid type conflicts.
        // `NonNullable<typeof p>` correctly infers the object shape from the map above
        // and is assignable to `SocialPost`, resolving the error.
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort((a, b) => {
          const aIndex = PLATFORMS.findIndex(p => p.name === a.platform.name);
          const bIndex = PLATFORMS.findIndex(p => p.name === b.platform.name);
          return aIndex - bIndex;
        });
      
      setSocialPosts(postsWithDetails);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during post generation.');
    } finally {
      setIsLoading(false);
    }
  }, [topic, tone, selectedPlatforms, userApiKey, isAiImageMode]);

  const handleRefinePost = useCallback(async (platformName: PlatformName, instruction: string) => {
    const postToRefine = socialPosts.find(p => p.platform.name === platformName);
    if (!postToRefine) return;

    setIsRefining(prev => ({ ...prev, [platformName]: true }));
    setError(null);

    try {
      const refinedGeneratedPost = await refinePost(postToRefine, instruction, postToRefine.platform, userApiKey);
      
      let newImageUrl = postToRefine.imageUrl;
      if (refinedGeneratedPost.imagePrompt && postToRefine.imagePrompt !== refinedGeneratedPost.imagePrompt && postToRefine.isAiImage) {
        newImageUrl = await generateImage(refinedGeneratedPost.imagePrompt, postToRefine.platform.aspectRatio, userApiKey).catch(e => {
            console.error(`Failed to generate refined image for ${platformName}`, e);
            return postToRefine.imageUrl;
        });
      }
      
      setSocialPosts(prevPosts => prevPosts.map(p => 
        p.platform.name === platformName 
        ? { ...p, ...refinedGeneratedPost, imageUrl: newImageUrl }
        : p
      ));
    } catch (e) {
      setError(e instanceof Error ? `Failed to refine post for ${platformName}: ${e.message}` : `An unknown error occurred while refining ${platformName} post.`);
    } finally {
      setIsRefining(prev => ({ ...prev, [platformName]: false }));
    }
  }, [socialPosts, userApiKey]);
  
  const handleSwapImage = useCallback(async (platformName: PlatformName) => {
      const postToSwap = socialPosts.find(p => p.platform.name === platformName);
      if (!postToSwap || !postToSwap.imageUrl) return;

      setIsSwapping(prev => ({ ...prev, [platformName]: true }));
      try {
          let newImageUrl: string | undefined;
          if (postToSwap.isAiImage && postToSwap.imagePrompt) {
              newImageUrl = await generateImage(postToSwap.imagePrompt, postToSwap.platform.aspectRatio, userApiKey);
          } else {
              newImageUrl = await fetchStockImage(`${topic} ${tone}`, postToSwap.platform.aspectRatio);
          }

          if (newImageUrl) {
              setSocialPosts(prev => prev.map(p => p.platform.name === platformName ? { ...p, imageUrl: newImageUrl } : p));
          }
      } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to swap image.');
      } finally {
          setIsSwapping(prev => ({...prev, [platformName]: false }));
      }
  }, [socialPosts, userApiKey, topic, tone]);
  
  const handleCopyAll = useCallback(() => {
    if (socialPosts.length === 0) return;

    const allText = socialPosts
        .map(post => `--- ${post.platform.name} ---\n${post.postText}`)
        .join('\n\n');
    
    navigator.clipboard.writeText(allText).then(() => {
        setIsAllCopied(true);
        setTimeout(() => setIsAllCopied(false), 2500);
    });
  }, [socialPosts]);


  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans">
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} apiKey={userApiKey} onSave={handleSaveApiKey} />
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <header className="text-center mb-8 relative">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 text-transparent bg-clip-text">
            AI Social Post Generator
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
            Craft compelling social media content in seconds. Just provide a topic, select your tone and platforms, and let Gemini do the creative work!
          </p>
          <button onClick={() => setShowSettings(true)} className={`absolute top-0 right-0 p-2 rounded-full transition-colors ${userApiKey ? 'text-green-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-800'}`} aria-label="Settings">
            <SettingsIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700/50 mb-8 sticky top-4 z-10 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-1">Topic</label>
                <textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., The benefits of remote work"
                  className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  rows={2}
                />
              </div>
               <div>
                <label htmlFor="tone" className="block text-sm font-medium text-slate-300 mb-1">Tone</label>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                  className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                >
                  {Object.values(Tone).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label htmlFor="ai-image-toggle" className="text-sm font-medium text-slate-300">Generate AI Images</label>
                 <button
                    onClick={() => setIsAiImageMode(!isAiImageMode)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isAiImageMode ? 'bg-purple-600' : 'bg-slate-600'}`}
                    id="ai-image-toggle"
                  >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isAiImageMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Platforms</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {PLATFORMS.map(platform => (
                    <button
                      key={platform.name}
                      onClick={() => handlePlatformToggle(platform.name)}
                      className={`flex flex-col items-center justify-center p-2 rounded-md border-2 transition-all duration-200 ${selectedPlatformNames.has(platform.name) ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'}`}
                    >
                      <platform.Icon className="w-6 h-6 mb-1" />
                      <span className="text-xs text-center">{platform.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGeneratePosts}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-lg font-semibold bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SparklesIcon className="w-6 h-6" />
                <span>{isLoading ? 'Generating...' : 'Generate Posts'}</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-8 text-center">
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}

        {socialPosts.length > 0 && !isLoading && (
          <div className="mb-8 flex justify-end">
            <button
              onClick={handleCopyAll}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                isAllCopied
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isAllCopied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
              <span>{isAllCopied ? 'Copied!' : 'Copy All Captions'}</span>
            </button>
          </div>
        )}

        <div className="space-y-8">
          {isLoading && <Loader />}
          {socialPosts.map(post => (
            <SocialPostCard
              key={post.platform.name}
              post={post}
              onRefine={handleRefinePost}
              isRefining={isRefining[post.platform.name] || false}
              onSwapImage={handleSwapImage}
              isSwapping={isSwapping[post.platform.name] || false}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;