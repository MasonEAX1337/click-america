import { Trophy, MousePointerClick, Zap, Star, Crown, Swords } from 'lucide-react';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  check: (profile: any) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'clicks_100',
    name: 'Getting Started',
    description: 'Reach 100 lifetime clicks',
    icon: MousePointerClick,
    check: (p: any) => p.totalClicks >= 100
  },
  {
    id: 'clicks_1000',
    name: 'Click Enthusiast',
    description: 'Reach 1,000 lifetime clicks',
    icon: MousePointerClick,
    check: (p: any) => p.totalClicks >= 1000
  },
  {
    id: 'clicks_10000',
    name: 'Click Master',
    description: 'Reach 10,000 lifetime clicks',
    icon: Crown,
    check: (p: any) => p.totalClicks >= 10000
  },
  {
    id: 'upgrade_power',
    name: 'Power User',
    description: 'Upgrade your click power',
    icon: Zap,
    check: (p: any) => p.clickPower > 1
  },
  {
    id: 'upgrade_auto',
    name: 'Automation',
    description: 'Hire your first intern',
    icon: Star,
    check: (p: any) => p.clicksPerSecond > 0
  },
  {
    id: 'event_participant',
    name: 'State Patriot',
    description: 'Participate in a state rivalry event',
    icon: Swords,
    check: (p: any) => (p.participatedEvents?.length || 0) > 0
  }
];
