import localforage from 'localforage';

localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'FriendDiffDB',
  version: 1.0,
  storeName: 'snapshots',
  description: 'Stores historical states of social media followers/following lists'
});

const SNAPSHOT_KEY_PREFIX = 'latest_followers_snapshot_';

export interface UserSnapshot {
  id: string;
  name?: string;
  username: string;
  pic_url?: string;
}

/**
 * Save a new snapshot of users.
 */
export async function saveSnapshot(userId: string, users: UserSnapshot[]): Promise<boolean> {
  try {
    await localforage.setItem(SNAPSHOT_KEY_PREFIX + userId, users);
    console.log(`Saved snapshot with ${users.length} users for ${userId}.`);
    return true;
  } catch (err) {
    console.error('Error saving snapshot:', err);
    return false;
  }
}

/**
 * Retrieve the last saved snapshot.
 */
export async function getSnapshot(userId: string): Promise<UserSnapshot[] | null> {
  try {
    const value = await localforage.getItem<UserSnapshot[]>(SNAPSHOT_KEY_PREFIX + userId);
    return value;
  } catch (err) {
    console.error('Error retrieving snapshot:', err);
    return null;
  }
}
