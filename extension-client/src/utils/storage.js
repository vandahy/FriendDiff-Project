import localforage from 'localforage';

// Configure localforage to use IndexedDB explicitly
// Similar to configuring a database connection in Spring/PHP
localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'FriendDiffDB',
  version: 1.0,
  storeName: 'snapshots',
  description: 'Stores historical states of social media followers/following lists'
});

const SNAPSHOT_KEY_PREFIX = 'latest_followers_snapshot_';

/**
 * Save a new snapshot of users.
 * @param {string} userId
 * @param {Array<{id: string, name: string}>} users 
 */
export async function saveSnapshot(userId, users) {
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
 * @param {string} userId
 * @returns {Promise<Array<{id: string, name: string}> | null>}
 */
export async function getSnapshot(userId) {
  try {
    const value = await localforage.getItem(SNAPSHOT_KEY_PREFIX + userId);
    return value;
  } catch (err) {
    console.error('Error retrieving snapshot:', err);
    return null;
  }
}
