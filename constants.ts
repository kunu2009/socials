
import type { Platform } from './types';
import { PlatformName } from './types';
import { LinkedInIcon, TwitterIcon, InstagramIcon, PinterestIcon, FacebookIcon, TikTokIcon, PinterestVideoIcon } from './components/Icons';

export const PLATFORMS: Platform[] = [
  {
    name: PlatformName.LinkedIn,
    aspectRatio: '16:9',
    Icon: LinkedInIcon,
  },
  {
    name: PlatformName.Twitter,
    aspectRatio: '16:9',
    Icon: TwitterIcon,
  },
  {
    name: PlatformName.Instagram,
    aspectRatio: '1:1',
    Icon: InstagramIcon,
  },
  {
    name: PlatformName.Pinterest,
    aspectRatio: '2:3',
    Icon: PinterestIcon,
  },
  {
    name: PlatformName.PinterestVideo,
    aspectRatio: '9:16',
    Icon: PinterestVideoIcon,
  },
  {
    name: PlatformName.Facebook,
    aspectRatio: '1:1',
    Icon: FacebookIcon,
  },
  {
    name: PlatformName.TikTok,
    aspectRatio: '9:16',
    Icon: TikTokIcon,
  },
];