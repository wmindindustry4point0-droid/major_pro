/**
 * Safely retrieve the current user from localStorage.
 * Returns null if not logged in or if the stored JSON is malformed.
 * FIX #4 / #20: Centralized safe parser — avoids repeated try/catch blocks
 * and prevents crashes when localStorage is cleared by another tab.
 */
export function getUser() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function getToken() {
    return localStorage.getItem('token') || null;
}

export function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}