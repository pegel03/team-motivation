// A bulletproof wrapper for localStorage that gracefully falls back to an
// in-memory store if the browser sandbox blocks localStorage access.

class SafeStorage {
  private memoryStore: Record<string, string> = {};
  private isAvailable: boolean = false;

  constructor() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, 'test');
        window.localStorage.removeItem(testKey);
        this.isAvailable = true;
      }
    } catch (e) {
      this.isAvailable = false;
      console.warn("localStorage is not accessible (e.g. iframe sandbox block). Falling back to in-memory storage.");
    }
  }

  public getItem(key: string): string | null {
    if (this.isAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.warn(`Failed to get item "${key}" from localStorage, using memory store fallback:`, e);
      }
    }
    return this.memoryStore.hasOwnProperty(key) ? this.memoryStore[key] : null;
  }

  public setItem(key: string, value: string): void {
    if (this.isAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn(`Failed to set item "${key}" in localStorage, using memory store fallback:`, e);
      }
    }
    this.memoryStore[key] = String(value);
  }

  public removeItem(key: string): void {
    if (this.isAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        console.warn(`Failed to remove item "${key}" from localStorage, using memory store fallback:`, e);
      }
    }
    delete this.memoryStore[key];
  }

  public clear(): void {
    if (this.isAvailable) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {
        console.warn("Failed to clear localStorage, using memory store fallback:", e);
      }
    }
    this.memoryStore = {};
  }
}

export const safeLocalStorage = new SafeStorage();
