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

// New function to get reminderID from notificationId
function getReminderKey(notificationId: string): string {
  return `reminder_${notificationId}`;
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
  
  // Check for any triggers today for this notification
  const notificationTriggersToday = (triggers[notificationId] || []).filter(ts => isToday(ts));
  
  // Get notification triggers by reminder ID to ensure we're not showing multiple
  // notifications for the same reminder with different notification IDs
  const reminderKey = getReminderKey(notificationId);
  const reminderTriggersToday = (triggers[reminderKey] || []).filter(ts => isToday(ts));
  
  // If either notification or reminder triggers exist today, don't show again
  if (notificationTriggersToday.length > 0 || reminderTriggersToday.length > 0) {
    return false;
  }

  const daysDiff = differenceInCalendarDays(dueDate, today);

  // Define the initial trigger days for each reminder type
  let triggerDays;
  switch (reminderType) {
    case 'CALIBRATION':
      triggerDays = [30, 7, 1, 0, -1]; // H-30, H-7, H-1, due date, and overdue
      break;
    case 'RENTAL':
    case 'MAINTENANCE':
      triggerDays = [7, 1, 0, -1]; // H-7, H-1, due date, and overdue
      break;
    case 'SCHEDULE':
      triggerDays = [1, 0, -1]; // H-1, due date, and overdue
      break;
    default:
      triggerDays = [0, -1]; // Only on due date and overdue
  }

  // Check if today is one of the trigger days
  const isNotificationDay = triggerDays.includes(daysDiff);
  
  return isNotificationDay;
} 