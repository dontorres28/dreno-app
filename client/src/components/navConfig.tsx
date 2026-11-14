import type { Icon } from '@phosphor-icons/react';
import { House, Barbell, MagnifyingGlass, ChatCircle, User, UsersThree, Gear } from '@phosphor-icons/react';

export interface NavItem {
  to: string;
  label: string;
  Icon: Icon;
  /** extra paths that should light this tab as active (sub-pages folded under it) */
  match?: string[];
}

type Role = 'athlete' | 'coach' | 'administrator' | undefined;

// One source of truth for both the desktop top bar and the mobile bottom tabs.
// Capped at 5 — iOS tab-bar discipline. Athlete's Goals/Journal/Playbook/Settings
// live under the "You" hub (/you).
export function navItemsFor(role: Role, t: (k: string) => string): NavItem[] {
  if (role === 'administrator') {
    return [
      { to: '/admin-dashboard', label: t('nav.dashboard'), Icon: House },
      { to: '/admin/athletes', label: 'Athletes', Icon: UsersThree },
      { to: '/admin/settings', label: 'Settings', Icon: Gear },
    ];
  }
  if (role === 'coach') {
    return [
      { to: '/coach-dashboard', label: t('nav.dashboard'), Icon: House },
      { to: '/coach/athletes', label: 'Roster', Icon: UsersThree, match: ['/coach/athletes/'] },
      { to: '/messages', label: t('nav.messages'), Icon: ChatCircle },
      { to: '/coach/profile/edit', label: t('nav.profile'), Icon: User },
    ];
  }
  // athlete (default)
  return [
    { to: '/dashboard', label: t('nav.dashboard'), Icon: House },
    { to: '/drills', label: t('nav.drills'), Icon: Barbell, match: ['/drills/'] },
    { to: '/coaches', label: t('nav.coaches'), Icon: MagnifyingGlass, match: ['/coach/', '/book/'] },
    { to: '/messages', label: t('nav.messages'), Icon: ChatCircle },
    { to: '/you', label: 'You', Icon: User, match: ['/goals', '/journal', '/playbook', '/settings'] },
  ];
}

export function isItemActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.to) return true;
  return (item.match ?? []).some(m => pathname === m || pathname.startsWith(m));
}
