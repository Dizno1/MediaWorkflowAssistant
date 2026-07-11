(function () {
  const DB_NAME = 'media-workflow-assistant-secure-settings';
  const DB_VERSION = 1;
  const KEY_STORE = 'keys';
  const SECRET_STORE = 'secrets';
  const MASTER_KEY_ID = 'provider-master-key';

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
        if (!db.objectStoreNames.contains(SECRET_STORE)) db.createObjectStore(SECRET_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Secure settings storage could not be opened.'));
    });
  }

  async function getMasterKey(db) {
    const existing = await getValue(db, KEY_STORE, MASTER_KEY_ID);
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await putValue(db, KEY_STORE, key, MASTER_KEY_ID);
    return key;
  }

  function getValue(db, storeName, id) {
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function putValue(db, storeName, value, id) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put(value, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function deleteValue(db, storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function save(id, value) {
    if (!window.crypto || !crypto.subtle || !window.indexedDB) throw new Error('This browser does not support secure credential storage.');
    const db = await openDatabase();
    try {
      const key = await getMasterKey(db);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = new TextEncoder().encode(JSON.stringify(value || {}));
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
      await putValue(db, SECRET_STORE, { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)), updatedAt: new Date().toISOString() }, id);
    } finally { db.close(); }
  }

  async function load(id) {
    if (!window.crypto || !crypto.subtle || !window.indexedDB) return null;
    const db = await openDatabase();
    try {
      const record = await getValue(db, SECRET_STORE, id);
      if (!record) return null;
      const key = await getMasterKey(db);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(record.iv) }, key, new Uint8Array(record.data));
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (error) {
      console.warn('A saved provider credential could not be restored.', error);
      return null;
    } finally { db.close(); }
  }

  async function remove(id) {
    const db = await openDatabase();
    try { await deleteValue(db, SECRET_STORE, id); }
    finally { db.close(); }
  }

  window.SecureCredentialStore = { save, load, remove };
})();
