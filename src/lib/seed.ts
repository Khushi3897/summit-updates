import { DEFAULT_USER_ID, EMPLOYEES, STORES } from './constants';
import type { Announcement, AppState, Category } from './types';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

export function buildSeed(now: Date): AppState {
  const allStores = STORES.map(store => store.id);
  function update(
    id: string, title: string, body: string, category: Category, requiresAck: boolean,
    audienceStoreIds: string[], authorId: string, daysAgo: number,
  ): Announcement {
    return {
      id, title, body, category, requiresAck, audienceStoreIds: [...audienceStoreIds], authorId,
      recipientIds: EMPLOYEES.filter(user => audienceStoreIds.includes(user.storeId)).map(user => user.id),
      publishedAt: new Date(now.getTime() - daysAgo * DAY).toISOString(),
    };
  }
  const announcements = [
    update('closing-safety', 'Revised closing safety procedure',
      'Close the sales floor with a second team member and check that all customers have exited before locking the doors. Use the closing checklist to inspect emergency exits and report any blocked routes to the manager on duty. Leave together through the designated staff exit once the final security check is complete.',
      'safety', true, ['bellevue'], 'rachel-kim', 2),
    update('return-policy', 'Return policy change: receipt required for refunds over $50',
      'Refunds over $50 now require the original receipt or a verified digital receipt. Check the purchase details before processing the refund and ask the manager on duty for help if the receipt cannot be found. Explain the policy calmly and offer the customer support team as the next point of contact.',
      'policy', true, allStores, 'michael-torres', 4),
    update('holiday-hours', 'Holiday hours: Nov 27 to Jan 2',
      'Our holiday trading schedule runs from Nov 27 through Jan 2. Check the posted schedule in your store for opening times and your assigned shifts. Speak with your manager as soon as possible if you spot a scheduling conflict.',
      'general', false, allStores, 'michael-torres', 1),
    update('window-display', 'New window display goes up Friday',
      'Bellevue and Downtown will install the new seasonal window display on Friday before opening. Keep the front display area clear at closing on Thursday and leave the labeled cartons in the stockroom. Your opening manager will assign setup tasks and check the finished display.',
      'general', false, ['bellevue', 'downtown'], 'michael-torres', 3),
    update('ladder-safety', 'Ladder and step-stool safety reminder',
      'Inspect ladders and step stools before each use and remove damaged equipment from the sales floor. Place equipment on a level surface and keep the surrounding aisle clear of customers. Ask a teammate for help with bulky stock and never stand on shelving or the top step.',
      'safety', true, ['redmond', 'kirkland'], 'michael-torres', 5),
    update('fridge-cleanout', 'Break room refrigerator cleanout every Friday',
      'The Tacoma break room refrigerator will be cleaned every Friday after the final meal break. Label food with your name and the date, and take personal containers home before closing. Unlabeled or expired food will be discarded during the cleanout.',
      'general', false, ['tacoma'], 'michael-torres', 6),
    update('employee-discount', 'Employee discount policy update',
      'Use your employee ID at checkout when making a purchase with the staff discount. Another team member must process the transaction, and the discount cannot be combined with customer promotional codes. Ask your manager to review any questions before completing the purchase.',
      'policy', true, allStores, 'michael-torres', 21),
    update('fall-results', 'Fall promotion results and thank-you',
      'Thank you for the care you put into our fall promotion across all five stores. Your product knowledge and attention to customers helped the teams finish the campaign strongly. We will share store highlights at the next team huddle.',
      'general', false, allStores, 'michael-torres', 35),
  ];
  announcements[0].quickCheck = {
    question: 'Should you complete closing alone?',
    options: ['Yes', 'No, with another team member'],
    correctOptionIndex: 1,
    explanation: 'Complete closing with a second team member and leave together after the final security check.',
  };
  const counts: Record<string, Record<string, number>> = {
    'closing-safety': { bellevue: 2 },
    'return-policy': { bellevue: 3, downtown: 3, redmond: 3, kirkland: 3, tacoma: 3 },
    'ladder-safety': { redmond: 3, kirkland: 3 },
  };
  const acknowledgments = announcements.flatMap(announcement => {
    let employeeIds: string[];
    if (announcement.id === 'employee-discount') {
      // Two pending employees in different stores; Alex and Maya have confirmed.
      employeeIds = announcement.recipientIds.filter(id => !['jordan-brooks', 'fatima-hassan'].includes(id));
    } else {
      employeeIds = Object.entries(counts[announcement.id] ?? {}).flatMap(([storeId, count]) =>
        EMPLOYEES.filter(user => user.storeId === storeId &&
          (announcement.id !== 'closing-safety' || user.id !== 'alex-rivera'))
          .slice(0, count).map(user => user.id));
    }
    return employeeIds.map((userId, index) => ({
      announcementId: announcement.id,
      userId,
      ackedAt: new Date(Date.parse(announcement.publishedAt) + (2 + index * 0.5) * HOUR).toISOString(),
    }));
  });
  return { version: 1, currentUserId: DEFAULT_USER_ID, announcements, acknowledgments };
}
