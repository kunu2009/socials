import React from 'react';

export enum Tone {
  Professional = 'Professional',
  Witty = 'Witty',
  Urgent = 'Urgent',
  Casual = 'Casual',
  Inspirational = 'Inspirational',
}

export enum ImageStyle {
  None = 'None',
  Photorealistic = 'Photorealistic',
  Illustration = 'Illustration',
  Minimalist = 'Minimalist',
  Cinematic = 'Cinematic',
  Fantasy = 'Fantasy',
  Abstract = 'Abstract',
}

export enum PlatformName {
  LinkedIn = 'LinkedIn',
  Twitter = 'X (Twitter)',
  Instagram = 'Instagram',
  Pinterest = 'Pinterest',
  Facebook = 'Facebook',
  TikTok = 'TikTok',
  PinterestVideo = 'Pinterest Video',
}

export interface Platform {
  name: PlatformName;
  aspectRatio: '1:1' | '9:16' | '16:9' | '4:3' | '3:4' | '2:3';
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

export interface GeneratedPost {
  platformName: PlatformName;
  postText: string; // Caption for all post types
  imagePrompt?: string;
  videoPrompt?: string;
  script?: string;
}

export interface SocialPost extends GeneratedPost {
  imageUrl?: string;
  isAiImage: boolean; // Flag to identify the image source
  platform: Platform;
  proTip?: string;
}
