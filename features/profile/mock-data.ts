export type Achievement = {
  id: string;
  label: string;
  value: string;
};

export type ProfileSnapshot = {
  name: string;
  /** Rendered into the avatar placeholder. No image asset in this milestone. */
  initials: string;
  bio: string;
  achievements: Achievement[];
};

/** Static M1d fixture. No account, no storage, no upload. */
export const profileMock: ProfileSnapshot = {
  name: 'Sam Rivera',
  initials: 'SR',
  bio: 'Building small daily habits that actually stick.',
  achievements: [
    { id: 'streak', label: 'Longest streak', value: '21' },
    { id: 'checkins', label: 'Check-ins', value: '86' },
    { id: 'goals', label: 'Goals finished', value: '3' },
  ],
};
