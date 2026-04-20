// Track Library System for DJ Application
// Provides persistent track storage using IndexedDB

// --- Interfaces ---

export interface LibraryTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  camelotKey: string;
  duration: number;
  genre: string;
  tags: string[];
  dateAdded: number;
  lastPlayed: number;
  playCount: number;
  isFavorite: boolean;
  playlistIds: string[];
  audioBlob: Blob;
  waveformData: number[];
  energy: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  dateCreated: number;
  color: string;
}

export type SortField = 'title' | 'artist' | 'bpm' | 'key' | 'duration' | 'dateAdded' | 'playCount' | 'energy';
export type SortDirection = 'asc' | 'desc';
export type FilterField = 'genre' | 'key' | 'bpmRange' | 'favorites' | 'playlist';

// --- IndexedDB Helpers ---

const DB_NAME = 'dj-track-library';
const DB_VERSION = 1;
const STORE_TRACKS = 'tracks';
const STORE_PLAYLISTS = 'playlists';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${crypto.randomUUID?.() ?? ''}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Tracks store
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const trackStore = db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
        trackStore.createIndex('title', 'title', { unique: false });
        trackStore.createIndex('artist', 'artist', { unique: false });
        trackStore.createIndex('bpm', 'bpm', { unique: false });
        trackStore.createIndex('key', 'key', { unique: false });
        trackStore.createIndex('genre', 'genre', { unique: false });
        trackStore.createIndex('dateAdded', 'dateAdded', { unique: false });
        trackStore.createIndex('playCount', 'playCount', { unique: false });
        trackStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        trackStore.createIndex('energy', 'energy', { unique: false });
      }

      // Playlists store
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Promise wrappers for IDBRequest
function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

// --- TrackLibrary Class ---

export class TrackLibrary {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = openDB();
  }

  private async getDB(): Promise<IDBDatabase> {
    return this.dbPromise;
  }

  // ==================== Track CRUD ====================

  async addTrack(track: Omit<LibraryTrack, 'id'>): Promise<string> {
    const db = await this.getDB();
    const id = generateId();
    const fullTrack: LibraryTrack = { id, ...track } as LibraryTrack;

    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    store.put(fullTrack);

    await transactionComplete(tx);
    return id;
  }

  async getTrack(id: string): Promise<LibraryTrack | null> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const result = await requestToPromise<LibraryTrack | undefined>(store.get(id));
    return result ?? null;
  }

  async updateTrack(id: string, updates: Partial<LibraryTrack>): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);

    const existing = await requestToPromise<LibraryTrack | undefined>(store.get(id));
    if (!existing) {
      tx.abort();
      throw new Error(`Track with id "${id}" not found`);
    }

    const updated: LibraryTrack = { ...existing, ...updates, id }; // ensure id is not overwritten
    store.put(updated);

    await transactionComplete(tx);
  }

  async deleteTrack(id: string): Promise<void> {
    const db = await this.getDB();

    // Delete the track and remove it from all playlists it belongs to
    const tx = db.transaction([STORE_TRACKS, STORE_PLAYLISTS], 'readwrite');
    const trackStore = tx.objectStore(STORE_TRACKS);
    const playlistStore = tx.objectStore(STORE_PLAYLISTS);

    const track = await requestToPromise<LibraryTrack | undefined>(trackStore.get(id));

    if (track) {
      // Remove track reference from each playlist it belongs to
      for (const playlistId of track.playlistIds) {
        const playlist = await requestToPromise<Playlist | undefined>(playlistStore.get(playlistId));
        if (playlist) {
          playlist.trackIds = playlist.trackIds.filter((tid) => tid !== id);
          playlistStore.put(playlist);
        }
      }
    }

    trackStore.delete(id);

    await transactionComplete(tx);
  }

  async getAllTracks(): Promise<LibraryTrack[]> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    return requestToPromise<LibraryTrack[]>(store.getAll());
  }

  // ==================== Search and Filter ====================

  async searchTracks(query: string): Promise<LibraryTrack[]> {
    const allTracks = await this.getAllTracks();
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) return allTracks;

    return allTracks.filter((track) => {
      const titleMatch = track.title.toLowerCase().includes(lowerQuery);
      const artistMatch = track.artist.toLowerCase().includes(lowerQuery);
      const tagMatch = track.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
      return titleMatch || artistMatch || tagMatch;
    });
  }

  async filterTracks(
    filters: FilterField[],
    values: Record<string, any>
  ): Promise<LibraryTrack[]> {
    let tracks = await this.getAllTracks();

    for (const filter of filters) {
      switch (filter) {
        case 'genre': {
          const genre = values.genre as string | undefined;
          if (genre) {
            tracks = tracks.filter(
              (t) => t.genre.toLowerCase() === genre.toLowerCase()
            );
          }
          break;
        }
        case 'key': {
          const key = values.key as string | undefined;
          if (key) {
            tracks = tracks.filter(
              (t) => t.key.toLowerCase() === key.toLowerCase() ||
                     t.camelotKey.toLowerCase() === key.toLowerCase()
            );
          }
          break;
        }
        case 'bpmRange': {
          const min = values.bpmMin as number | undefined;
          const max = values.bpmMax as number | undefined;
          if (min !== undefined) {
            tracks = tracks.filter((t) => t.bpm >= min);
          }
          if (max !== undefined) {
            tracks = tracks.filter((t) => t.bpm <= max);
          }
          break;
        }
        case 'favorites': {
          tracks = tracks.filter((t) => t.isFavorite);
          break;
        }
        case 'playlist': {
          const playlistId = values.playlistId as string | undefined;
          if (playlistId) {
            tracks = tracks.filter((t) => t.playlistIds.includes(playlistId));
          }
          break;
        }
      }
    }

    return tracks;
  }

  sortTracks(
    tracks: LibraryTrack[],
    field: SortField,
    direction: SortDirection
  ): LibraryTrack[] {
    const sorted = [...tracks].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }

      return 0;
    });

    return direction === 'desc' ? sorted.reverse() : sorted;
  }

  async getTracksByPlaylist(playlistId: string): Promise<LibraryTrack[]> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const allTracks = await requestToPromise<LibraryTrack[]>(store.getAll());
    return allTracks.filter((t) => t.playlistIds.includes(playlistId));
  }

  async getFavoriteTracks(): Promise<LibraryTrack[]> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const index = store.index('isFavorite');
    return requestToPromise<LibraryTrack[]>(index.getAll(IDBKeyRange.only(true)));
  }

  async getRecentTracks(limit: number): Promise<LibraryTrack[]> {
    const allTracks = await this.getAllTracks();
    return this.sortTracks(allTracks, 'dateAdded', 'desc').slice(0, limit);
  }

  // ==================== Playlist Management ====================

  async createPlaylist(name: string, color: string): Promise<string> {
    const db = await this.getDB();
    const id = generateId();
    const playlist: Playlist = {
      id,
      name,
      trackIds: [],
      dateCreated: Date.now(),
      color,
    };

    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);
    store.put(playlist);

    await transactionComplete(tx);
    return id;
  }

  async deletePlaylist(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction([STORE_TRACKS, STORE_PLAYLISTS], 'readwrite');
    const trackStore = tx.objectStore(STORE_TRACKS);
    const playlistStore = tx.objectStore(STORE_PLAYLISTS);

    // Remove playlistId from all tracks that reference it
    const allTracks = await requestToPromise<LibraryTrack[]>(trackStore.getAll());
    for (const track of allTracks) {
      if (track.playlistIds.includes(id)) {
        track.playlistIds = track.playlistIds.filter((pid) => pid !== id);
        trackStore.put(track);
      }
    }

    playlistStore.delete(id);

    await transactionComplete(tx);
  }

  async addToPlaylist(trackId: string, playlistId: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction([STORE_TRACKS, STORE_PLAYLISTS], 'readwrite');
    const trackStore = tx.objectStore(STORE_TRACKS);
    const playlistStore = tx.objectStore(STORE_PLAYLISTS);

    const track = await requestToPromise<LibraryTrack | undefined>(trackStore.get(trackId));
    if (!track) {
      tx.abort();
      throw new Error(`Track "${trackId}" not found`);
    }

    const playlist = await requestToPromise<Playlist | undefined>(playlistStore.get(playlistId));
    if (!playlist) {
      tx.abort();
      throw new Error(`Playlist "${playlistId}" not found`);
    }

    // Update track's playlistIds
    if (!track.playlistIds.includes(playlistId)) {
      track.playlistIds.push(playlistId);
      trackStore.put(track);
    }

    // Update playlist's trackIds
    if (!playlist.trackIds.includes(trackId)) {
      playlist.trackIds.push(trackId);
      playlistStore.put(playlist);
    }

    await transactionComplete(tx);
  }

  async removeFromPlaylist(trackId: string, playlistId: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction([STORE_TRACKS, STORE_PLAYLISTS], 'readwrite');
    const trackStore = tx.objectStore(STORE_TRACKS);
    const playlistStore = tx.objectStore(STORE_PLAYLISTS);

    const track = await requestToPromise<LibraryTrack | undefined>(trackStore.get(trackId));
    const playlist = await requestToPromise<Playlist | undefined>(playlistStore.get(playlistId));

    if (track && track.playlistIds.includes(playlistId)) {
      track.playlistIds = track.playlistIds.filter((pid) => pid !== playlistId);
      trackStore.put(track);
    }

    if (playlist && playlist.trackIds.includes(trackId)) {
      playlist.trackIds = playlist.trackIds.filter((tid) => tid !== trackId);
      playlistStore.put(playlist);
    }

    await transactionComplete(tx);
  }

  async getAllPlaylists(): Promise<Playlist[]> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_PLAYLISTS, 'readonly');
    const store = tx.objectStore(STORE_PLAYLISTS);
    return requestToPromise<Playlist[]>(store.getAll());
  }

  async renamePlaylist(id: string, newName: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);

    const playlist = await requestToPromise<Playlist | undefined>(store.get(id));
    if (!playlist) {
      tx.abort();
      throw new Error(`Playlist "${id}" not found`);
    }

    playlist.name = newName;
    store.put(playlist);

    await transactionComplete(tx);
  }

  // ==================== Favorites ====================

  async toggleFavorite(trackId: string): Promise<boolean> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);

    const track = await requestToPromise<LibraryTrack | undefined>(store.get(trackId));
    if (!track) {
      tx.abort();
      throw new Error(`Track "${trackId}" not found`);
    }

    track.isFavorite = !track.isFavorite;
    store.put(track);

    await transactionComplete(tx);
    return track.isFavorite;
  }

  // ==================== Playback Tracking ====================

  async recordPlay(trackId: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);

    const track = await requestToPromise<LibraryTrack | undefined>(store.get(trackId));
    if (!track) {
      tx.abort();
      throw new Error(`Track "${trackId}" not found`);
    }

    track.playCount += 1;
    track.lastPlayed = Date.now();
    store.put(track);

    await transactionComplete(tx);
  }

  // ==================== Import / Export ====================

  async exportLibrary(): Promise<Blob> {
    const tracks = await this.getAllTracks();
    const playlists = await this.getAllPlaylists();

    // Strip audioBlob and waveformData from tracks (binary/large data)
    const exportTracks = tracks.map(({ audioBlob, waveformData, ...rest }) => rest);

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tracks: exportTracks,
      playlists,
    };

    const json = JSON.stringify(exportData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async importTrackFromUrl(url: string, metadata: Partial<LibraryTrack>): Promise<string> {
    // Fetch the audio file from the URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio from URL: ${response.status} ${response.statusText}`);
    }

    const audioBlob = await response.blob();

    // Build the track with defaults for missing fields
    const now = Date.now();
    const track: Omit<LibraryTrack, 'id'> = {
      title: metadata.title ?? 'Unknown Title',
      artist: metadata.artist ?? 'Unknown Artist',
      bpm: metadata.bpm ?? 0,
      key: metadata.key ?? '',
      camelotKey: metadata.camelotKey ?? '',
      duration: metadata.duration ?? 0,
      genre: metadata.genre ?? '',
      tags: metadata.tags ?? [],
      dateAdded: now,
      lastPlayed: metadata.lastPlayed ?? 0,
      playCount: metadata.playCount ?? 0,
      isFavorite: metadata.isFavorite ?? false,
      playlistIds: metadata.playlistIds ?? [],
      audioBlob,
      waveformData: metadata.waveformData ?? [],
      energy: metadata.energy ?? 0,
    };

    return this.addTrack(track);
  }
}
