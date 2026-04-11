/**
 * Lifeline definitions inspired by Seen Jeem.
 * Each team selects 3 lifelines from these options.
 */

export type LifelineId = 'callAFriend' | 'discard' | 'answerRewards' | 'rest';

export const LIFELINES: { id: LifelineId; label: string; description: string }[] = [
  { id: 'callAFriend', label: 'Call a Friend', description: 'Consult someone outside the game before answering' },
  { id: 'discard', label: 'Discard', description: 'Skip the question without penalty' },
  { id: 'answerRewards', label: 'Answer Rewards', description: 'Reveals a hint or partial answer' },
  { id: 'rest', label: 'Rest', description: 'Take a break, pass to next team' },
];

export const LIFELINES_PER_TEAM = 3;
