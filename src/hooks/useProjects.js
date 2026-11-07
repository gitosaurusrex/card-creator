import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { cacheKeys, readJSON, writeJSON } from '../lib/storage.js';
import { createCard, newId } from '../lib/cards.js';

const SAVE_DEBOUNCE_MS = 1500;
// Browsers reject keepalive requests with bodies over 64 KB.
const KEEPALIVE_BODY_LIMIT = 60 * 1024;
// Edits closer together than this (typing, dragging a slider) undo as one step.
const UNDO_GROUP_MS = 800;
const UNDO_LIMIT = 100;

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const modifiedTime = (project) => new Date(project.lastModified).getTime() || 0;

// The user a Clerk session token was issued to (its `sub` claim), or null
// if the token can't be read.
function tokenSubject(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).sub ?? null;
  } catch {
    return null;
  }
}

/**
 * A signed-in user's projects: loading, editing, autosave to the server
 * (with a local copy), delete, image upload and undo/redo.
 *
 * `onRekey(oldId, newId)` is called when the server reports that a project's
 * ID belongs to another account and the project gets a fresh one.
 */
export function useProjects(userId, { onRekey } = {}) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved');
  const { getToken } = useAuth();
  const keys = useMemo(() => cacheKeys(userId), [userId]);

  // Refs let the save machinery read the latest values from timers and
  // page-lifecycle events without re-subscribing on every render.
  const getTokenRef = useRef(getToken);
  const onRekeyRef = useRef(onRekey);
  const projectsRef = useRef(projects);
  const dirtyIdsRef = useRef(new Set());
  const saveTimerRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  // Set once this user's workspace is gone (sign-out or account switch).
  // After that nothing is sent: the session may already belong to someone
  // else. Unsent edits stay in this user's local copy, marked unsynced, and
  // go up the next time they sign in.
  const disposedRef = useRef(false);

  useEffect(() => {
    getTokenRef.current = getToken;
    onRekeyRef.current = onRekey;
  }, [getToken, onRekey]);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const setUnsynced = useCallback((id, unsynced) => {
    const ids = new Set(readJSON(keys.unsynced, []));
    if (unsynced) ids.add(id);
    else ids.delete(id);
    writeJSON(keys.unsynced, [...ids]);
  }, [keys]);

  // Undo history for the cards of one project at a time.
  const historyRef = useRef({ projectId: null, past: [], future: [], lastAt: 0, lastGroup: null });
  const [historyVersion, setHistoryVersion] = useState(0);
  const bumpHistory = () => setHistoryVersion(v => v + 1);

  // Give a project a fresh ID, everywhere it is referenced. Used when the
  // server says its ID already belongs to another account.
  const rekeyProject = useCallback((oldId) => {
    const freshId = newId();
    const rekey = list => list.map(p => (p.id === oldId ? { ...p, id: freshId } : p));
    projectsRef.current = rekey(projectsRef.current);
    setProjects(rekey);
    if (historyRef.current.projectId === oldId) historyRef.current.projectId = freshId;
    onRekeyRef.current?.(oldId, freshId);
    if (dirtyIdsRef.current.delete(oldId)) dirtyIdsRef.current.add(freshId);
    setUnsynced(oldId, false);
    setUnsynced(freshId, true);
    writeJSON(keys.projects, projectsRef.current);
    return projectsRef.current.find(p => p.id === freshId);
  }, [keys, setUnsynced]);

  // Saves are serialized so an older request can never land after (and
  // overwrite) a newer one. Each job sends the project as it is when the
  // job runs, not when it was queued.
  const pushProject = useCallback((id, { keepalive = false } = {}) => {
    const job = async () => {
      let project = projectsRef.current.find(p => p.id === id);
      if (!project || disposedRef.current) return;
      setSaveStatus('saving');
      try {
        const token = await getTokenRef.current();
        if (!token) throw new Error('No session token');
        const subject = tokenSubject(token);
        if (disposedRef.current || (subject && subject !== userId)) {
          console.warn('Skipped a save: the signed-in account changed.');
          return;
        }
        const post = (proj) => {
          const body = JSON.stringify(proj);
          return fetch('/api/projects', {
            method: 'POST',
            keepalive: keepalive && body.length < KEEPALIVE_BODY_LIMIT,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body,
          });
        };
        let res = await post(project);
        if (res.status === 409) {
          project = rekeyProject(project.id);
          res = await post(project);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        // Keep the marker if the project was edited again while this was in flight.
        if (!dirtyIdsRef.current.has(project.id)) setUnsynced(project.id, false);
        setSaveStatus(dirtyIdsRef.current.size > 0 ? 'unsaved' : 'saved');
      } catch (err) {
        console.error('Cloud save failed:', err);
        setSaveStatus('error');
      }
    };
    saveQueueRef.current = saveQueueRef.current.then(job);
    return saveQueueRef.current;
  }, [userId, setUnsynced, rekeyProject]);

  // Write pending changes to the local cache immediately, then queue them
  // for the server. Safe to call at any time; a no-op when nothing changed.
  const flushSave = useCallback(({ keepalive = false } = {}) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const ids = [...dirtyIdsRef.current];
    if (ids.length === 0) return saveQueueRef.current;
    dirtyIdsRef.current.clear();
    writeJSON(keys.projects, projectsRef.current);
    ids.forEach(id => setUnsynced(id, true));
    ids.forEach(id => pushProject(id, { keepalive }));
    return saveQueueRef.current;
  }, [keys, setUnsynced, pushProject]);

  // Debounced autosave, triggered explicitly by edits (merely opening a
  // project doesn't save it). Closing a project or hiding the tab flushes.
  const scheduleSave = useCallback((id) => {
    dirtyIdsRef.current.add(id);
    setSaveStatus('unsaved');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => flushSave(), SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  // The one way to edit a project: applies the change, stamps it, saves it.
  const updateProject = useCallback((id, change) => {
    setProjects(prev => prev.map(p => (p.id === id ? { ...change(p), lastModified: Date.now() } : p)));
    scheduleSave(id);
  }, [scheduleSave]);

  const setCards = useCallback((projectId, cards) => {
    updateProject(projectId, p => ({ ...p, cards }));
  }, [updateProject]);

  /**
   * Change a project's cards, recording an undo step. Pass `group` (e.g. the
   * field being typed into or dragged) to fold quick repeated edits of the
   * same thing into one step; one-off actions always get their own step.
   */
  const updateCards = useCallback((projectId, change, { group = null } = {}) => {
    const current = projectsRef.current.find(p => p.id === projectId)?.cards;
    const history = historyRef.current;
    if (current) {
      const now = Date.now();
      if (history.projectId !== projectId) {
        Object.assign(history, { projectId, past: [], future: [], lastAt: 0, lastGroup: null });
      }
      const sameBurst = group !== null && group === history.lastGroup && now - history.lastAt <= UNDO_GROUP_MS;
      if (!sameBurst) {
        history.past = [...history.past.slice(-(UNDO_LIMIT - 1)), current];
      }
      history.future = [];
      history.lastAt = now;
      history.lastGroup = group;
      bumpHistory();
    }
    updateProject(projectId, p => ({ ...p, cards: change(p.cards) }));
  }, [updateProject]);

  const undo = useCallback((projectId) => {
    const history = historyRef.current;
    const current = projectsRef.current.find(p => p.id === projectId)?.cards;
    if (history.projectId !== projectId || history.past.length === 0 || !current) return null;
    const previous = history.past[history.past.length - 1];
    history.past = history.past.slice(0, -1);
    history.future = [current, ...history.future];
    history.lastAt = 0;
    history.lastGroup = null;
    bumpHistory();
    setCards(projectId, previous);
    return previous;
  }, [setCards]);

  const redo = useCallback((projectId) => {
    const history = historyRef.current;
    const current = projectsRef.current.find(p => p.id === projectId)?.cards;
    if (history.projectId !== projectId || history.future.length === 0 || !current) return null;
    const [next, ...rest] = history.future;
    history.future = rest;
    history.past = [...history.past, current];
    history.lastAt = 0;
    history.lastGroup = null;
    bumpHistory();
    setCards(projectId, next);
    return next;
  }, [setCards]);

  const resetHistory = useCallback((projectId) => {
    historyRef.current = { projectId, past: [], future: [], lastAt: 0, lastGroup: null };
    bumpHistory();
  }, []);

  const historyState = useMemo(() => {
    void historyVersion; // recompute whenever the history changes
    const h = historyRef.current;
    return { projectId: h.projectId, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
  }, [historyVersion]);

  useEffect(() => {
    let cancelled = false;
    const loadProjects = async () => {
      const cached = readJSON(keys.projects, []);
      const unsyncedIds = new Set(readJSON(keys.unsynced, []));
      let list = cached;
      let loadedFromServer = false;
      try {
        const token = await getTokenRef.current();
        const res = await fetch('/api/projects', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const server = await res.json();
        if (!Array.isArray(server)) throw new Error('Unexpected response');
        // The server is authoritative, except for local edits it never
        // confirmed (e.g. the tab closed mid-save): those win and get re-sent.
        const pending = new Map(cached.filter(p => unsyncedIds.has(p.id)).map(p => [p.id, p]));
        const serverIds = new Set(server.map(p => p.id));
        list = [
          ...server.map(p => pending.get(p.id) || p),
          ...[...pending.values()].filter(p => !serverIds.has(p.id)),
        ].sort((a, b) => modifiedTime(b) - modifiedTime(a));
        loadedFromServer = true;
      } catch (err) {
        console.warn("Couldn't load projects from the cloud; using this browser's copy.", err);
      }
      if (cancelled) return;
      projectsRef.current = list;
      setProjects(list);
      writeJSON(keys.projects, list);
      setIsLoading(false);
      if (loadedFromServer) {
        list.filter(p => unsyncedIds.has(p.id)).forEach(p => pushProject(p.id));
      }
    };
    loadProjects();
    return () => { cancelled = true; };
  }, [keys, pushProject]);

  // Flush when the tab is hidden or closed, and when signing out unmounts us.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushSave({ keepalive: true });
    };
    const onPageHide = () => flushSave({ keepalive: true });
    disposedRef.current = false;
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      // Keep pending edits in this user's local copy (marked unsynced), but
      // send nothing: by now the session may belong to a different account.
      disposedRef.current = true;
      flushSave();
    };
  }, [flushSave]);

  /** Creates a project with one card; returns the new project. */
  const createProject = useCallback(() => {
    const project = {
      id: newId(),
      name: `My project ${projectsRef.current.length + 1}`,
      cards: [createCard()],
      lastModified: Date.now(),
    };
    projectsRef.current = [project, ...projectsRef.current];
    setProjects(prev => [project, ...prev]);
    scheduleSave(project.id);
    return project;
  }, [scheduleSave]);

  /** Makes sure a project has at least one card (repairs empty projects). */
  const ensureCards = useCallback((id) => {
    const project = projectsRef.current.find(p => p.id === id);
    if (!project) return null;
    if (Array.isArray(project.cards) && project.cards.length > 0) return project.cards;
    const cards = [createCard()];
    setCards(id, cards);
    return cards;
  }, [setCards]);

  /** Deletes a project on the server, then locally. Returns true on success. */
  const deleteProject = useCallback(async (id) => {
    // Let any queued save for this project finish first, so it can't
    // re-create the project on the server after the delete.
    dirtyIdsRef.current.delete(id);
    await saveQueueRef.current;

    try {
      const token = await getTokenRef.current();
      const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Delete failed:', err);
      return false;
    }

    const next = projectsRef.current.filter(p => p.id !== id);
    projectsRef.current = next;
    setProjects(next);
    writeJSON(keys.projects, next);
    setUnsynced(id, false);
    return true;
  }, [keys, setUnsynced]);

  /**
   * Uploads an image and returns its URL. Throws an Error whose message is
   * written for the person using the app.
   */
  const uploadImage = useCallback(async (file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('That file isn\'t a picture we can use. Try a PNG, JPEG, GIF or WebP image.');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('That picture is too big. Pick one smaller than 3 MB.');
    }
    let res;
    try {
      const base64 = await readFileAsDataURL(file);
      const token = await getTokenRef.current();
      res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: base64, fileName: file.name }),
      });
    } catch (err) {
      console.error('Upload failed:', err);
      throw new Error('The picture didn\'t upload. Check the internet connection and try again.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      console.error('Upload failed:', res.status, data);
      if (res.status === 413) throw new Error(data.error || 'That picture is too big. Pick one smaller than 3 MB.');
      throw new Error(data.error ? `The picture didn't upload: ${data.error}` : `The picture didn't upload (error ${res.status}). Try again.`);
    }
    return data.url;
  }, []);

  return {
    projects, isLoading, saveStatus,
    updateProject, updateCards, createProject, ensureCards, deleteProject, uploadImage, flushSave,
    undo, redo, resetHistory, history: historyState,
  };
}
