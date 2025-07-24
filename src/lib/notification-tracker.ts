import { differenceInCalendarDays, isToday, startOfToday } from 'date-fns';

const STORAGE_KEY = 'notification_triggers';

type TriggerRecord = {
  [notificationId: string]: number[]; // Array of timestamps
};

function getTriggers(): TriggerRecord {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const triggers: TriggerRecord = JSON.parse(stored);

    // Cleanup old entries (older than 2 days ago)
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    Object.keys(triggers).forEach(key => {
      triggers[key] = triggers[key].filter(ts => ts > twoDaysAgo);
      if (triggers[key].length === 0) {
        delete triggers[key];
      }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(triggers));

    return triggers;
  } catch (error) {
    console.error('Error reading notification triggers from localStorage:', error);
    localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

function saveTriggers(triggers: TriggerRecord) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(triggers));
  } catch (error) {
    console.error('Error writing notification triggers to localStorage:', error);
  }
}

export function recordNotificationTrigger(notificationId: string) {
  const triggers = getTriggers();
  if (!triggers[notificationId]) {
    triggers[notificationId] = [];
  }
  triggers[notificationId].push(Date.now());
  saveTriggers(triggers);
}

export function canShowNotification(notificationId: string, dueDateStr: string, reminderType: string): boolean {
  if (typeof window === 'undefined') return false;

  const triggers = getTriggers();
  const today = startOfToday();
  const dueDate = new Date(dueDateStr);
  const notificationTriggersToday = (triggers[notificationId] || []).filter(ts => isToday(ts));

  const daysDiff = differenceInCalendarDays(dueDate, today);

  // Define the initial (and only) trigger day for each reminder type
  let initialTriggerDay;
  switch (reminderType) {
    case 'CALIBRATION':
      initialTriggerDay = 30;
      break;
    case 'RENTAL':
    case 'MAINTENANCE':
      initialTriggerDay = 7;
      break;
    case 'SCHEDULE':
      initialTriggerDay = 0;
      break;
    default:
      return false; // For unknown types, never show notification.
  }

  // Determine if today is a valid day to show the notification.
  // A notification is valid if its due date is on or after the trigger day.
  const isNotificationDay = daysDiff <= initialTriggerDay;

  // If it's not a valid day to show, simply return false.
  if (!isNotificationDay) {
    return false;
  }

  // If it IS a valid day, the rule is simple:
  // only show if it hasn't been triggered today.
  return notificationTriggersToday.length === 0;
} 