import { GoogleGenAI, Type } from '@google/genai';
import type { GeneratedPost, Platform, Tone } from '../types';
import { PlatformName } from '../types';

let ai: GoogleGenAI | null = null;
let currentApiKey: string | undefined = undefined;

/**
 * Creates or retrieves a memoized instance of the GoogleGenAI client.
 * This is now a function to allow re-initialization with a user-provided API key.
 */
const getAiClient = (userApiKey?: string): GoogleGenAI => {
    const keyToUse = userApiKey || process.env.API_KEY;

    // If a client exists and the key hasn't changed, return the existing client.
    if (ai && currentApiKey === keyToUse) {
        return ai;
    }

    if (!keyToUse) {
        throw new Error("API Key not found. Please provide an API key in settings or ensure it's set in your environment.");
    }

    // Create a new client if one doesn't exist or if the key has changed.
    ai = new GoogleGenAI({ apiKey: keyToUse });
    currentApiKey = keyToUse;
    return ai;
};


/**
 * Generates social media post text and image prompts for multiple platforms.
 */
export const generateSocialPosts = async (
  topic: string,
  tone: Tone,
  platforms: Platform[],
  apiKey?: string,
): Promise<GeneratedPost[]> => {
  try {
    const localAi = getAiClient(apiKey);
    const model = 'gemini-2.5-pro';
    const platformNames = platforms.map(p => p.name).join(', ');
    const prompt = `You are a social media marketing expert. Your task is to generate engaging social media content based on a given topic, tone, and list of platforms.

Topic: "${topic}"
Tone: ${tone}
Platforms: ${platformNames}

For each platform, provide a JSON object with the appropriate fields:
- For standard image-based platforms, provide: "platformName", "postText" (the caption), and "imagePrompt" (a creative prompt for an AI image generator).
- For video-based platforms like TikTok or Pinterest Video, provide: "platformName", "postText" (the caption), "videoPrompt" (a prompt for an AI video generator), and "script" (a brief script or storyboard outline).

Return the response as a valid JSON array of these objects, with one object for each requested platform.`;

    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          platformName: {
            type: Type.STRING,
            description: 'The name of the social media platform.',
            enum: platforms.map(p => p.name),
          },
          postText: {
            type: Type.STRING,
            description: 'The text content for the social media post, tailored for the specific platform. Use markdown for formatting.',
          },
          imagePrompt: {
            type: Type.STRING,
            description: 'A detailed, creative prompt for an AI image generator. Only for image-based posts.',
          },
          videoPrompt: {
            type: Type.STRING,
            description: 'A detailed prompt for an AI video generator. Only for video-based posts.',
          },
          script: {
            type: Type.STRING,
            description: 'A brief script or storyboard for a video post. Only for video-based posts.',
          },
        },
        required: ['platformName', 'postText'],
      },
    };

    const response = await localAi.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.7,
      },
    });

    const resultText = response.text.trim();
    const generatedPosts: GeneratedPost[] = JSON.parse(resultText);
    return generatedPosts;
  } catch (error) {
    console.error('Error generating social posts:', error);
    throw new Error('Failed to generate social media content. Please try again.');
  }
};

/**
 * Generates an image based on a prompt and aspect ratio.
 */
export const generateImage = async (
  prompt: string,
  aspectRatio: '1:1' | '9:16' | '16:9' | '4:3' | '3:4' | '2:3',
  apiKey?: string,
): Promise<string> => {
  try {
    const localAi = getAiClient(apiKey);
    const response = await localAi.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    if (!base64ImageBytes) {
      throw new Error('API did not return image data.');
    }
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Failed to generate image. Please try again.');
  }
};

/**
 * Refines an existing social media post based on a user's instruction.
 */
export const refinePost = async (
  originalPost: GeneratedPost,
  instruction: string,
  platform: Platform,
  apiKey?: string,
): Promise<GeneratedPost> => {
  try {
    const localAi = getAiClient(apiKey);
    const model = 'gemini-2.5-pro';
    const isVideo = platform.name === PlatformName.PinterestVideo || platform.name === PlatformName.TikTok;

    const originalContent = isVideo 
        ? `Original Post Text: "${originalPost.postText}"\nOriginal Video Prompt: "${originalPost.videoPrompt}"\nOriginal Script: "${originalPost.script}"`
        : `Original Post Text: "${originalPost.postText}"\nOriginal Image Prompt: "${originalPost.imagePrompt}"`;
        
    const requiredFields = isVideo
        ? 'Generate a new, improved post text, video prompt, and script.'
        : 'Generate a new, improved post text and a corresponding new image prompt.';


    const prompt = `You are a social media marketing expert. Your task is to refine an existing social media post based on a specific instruction.

Platform: ${platform.name}
${originalContent}

Refinement Instruction: "${instruction}"

Based on the instruction, ${requiredFields}
The tone and style should remain appropriate for the platform.

Return the response as a single valid JSON object. You must include "platformName", "postText", and the other relevant fields (${isVideo ? '"videoPrompt", "script"' : '"imagePrompt"'}).`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        platformName: {
          type: Type.STRING,
          description: 'The name of the social media platform.',
          enum: [platform.name],
        },
        postText: {
          type: Type.STRING,
          description: 'The refined text content for the social media post, following the provided instruction.',
        },
        imagePrompt: {
            type: Type.STRING,
            description: 'A new, refined prompt for an AI image generator, based on the instruction and new post text.',
        },
        videoPrompt: {
            type: Type.STRING,
            description: 'A new, refined prompt for an AI video generator, based on the instruction and new post text.',
        },
        script: {
            type: Type.STRING,
            description: 'A new, refined script or storyboard for the video, based on the instruction.',
        },
      },
      required: ['platformName', 'postText', ...(isVideo ? ['videoPrompt', 'script'] : ['imagePrompt'])],
    };
    
    const response = await localAi.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.7,
      },
    });
    
    const resultText = response.text.trim();
    const refinedPost: GeneratedPost = JSON.parse(resultText);
    return refinedPost;

  } catch (error) {
      console.error('Error refining post:', error);
      throw new Error('Failed to refine post. Please try again.');
  }
};

/**
 * Generates a single, actionable tip for a given social media platform.
 */
export const generateProTip = async (platformName: PlatformName, apiKey?: string): Promise<string> => {
  try {
    const localAi = getAiClient(apiKey);
    const model = 'gemini-2.5-flash';
    const prompt = `Provide a single, concise pro-tip for posting on ${platformName}. Focus on either the best content formats (e.g., carousels, short-form video) or optimal posting times for maximum engagement. The tip should be a single sentence.`;

    const response = await localAi.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.warn(`Could not generate pro-tip for ${platformName}:`, error);
    // Return a generic fallback tip in case of an error
    return "Engage with your audience by responding to comments and messages promptly to build a strong community.";
  }
};