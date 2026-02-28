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

const SNAPSHOT_KEY = 'latest_followers_snapshot';

/**
 * Save a new snapshot of users.
 * @param {Array<{id: string, name: string}>} users 
 */
export async function saveSnapshot(users) {
  try {
    await localforage.setItem(SNAPSHOT_KEY, users);
    console.log(`Saved snapshot with ${users.length} users.`);
    return true;
  } catch (err) {
    console.error('Error saving snapshot:', err);
    return false;
  }
}

/**
 * Retrieve the last saved snapshot.
 * @returns {Promise<Array<{id: string, name: string}> | null>}
 */
export async function getSnapshot() {
  try {
    const value = await localforage.getItem(SNAPSHOT_KEY);
    return value;
  } catch (err) {
    console.error('Error retrieving snapshot:', err);
    return null;
  }
}
