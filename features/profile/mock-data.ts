export type Achievement = {
  id: string;
  label: string;
  value: string;
};

export type ProfileSnapshot = {
  achievements: Achievement[];
};

/**
 * Sample achievements, labelled as such on screen — see ADR-009.
 *
 * The name, initials and bio that used to live here were removed in M4: the
 * Profile header now shows the real signed-in account, and a fixture identity
 * beside a real one would be the misleading kind of placeholder rather than the
 * labelled kind.
 */
export const profileMock: ProfileSnapshot = {
  achievements: [
    { id: 'streak', label: 'Longest streak', value: '21' },
    { id: 'checkins', label: 'Check-ins', value: '86' },
    { id: 'goals', label: 'Goals finished', value: '3' },
  ],
};
