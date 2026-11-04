import { HAS_SEEN_TOUR_KEY } from '../i18n/translations';

export function markTourAsSeen() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HAS_SEEN_TOUR_KEY, 'true');
    }
  } catch {
    // ignore storage quota/security errors
  }
}

export function hasSeenOnboardingTour() {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(HAS_SEEN_TOUR_KEY) === 'true';
    }
  } catch {
    // ignore
  }
  return false;
}