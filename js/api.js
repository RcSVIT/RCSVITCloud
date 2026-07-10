// api.js – shared API helper for RCSVIT Cloud Archive
const API_BASE = 'https://rcsvitcloud.onrender.com/api';

/**
 * Generic fetch wrapper that automatically adds the admin token
 * (except for auth endpoints) and handles 401 redirects.
 */
export async function apiFetch(endpoint, options = {}) {
    const adminToken = localStorage.getItem('admin_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    // Attach token only if it exists and the endpoint is not auth-related
    if (adminToken && !endpoint.startsWith('/auth')) {
        headers['Authorization'] = `Bearer ${adminToken}`;
    }
    const resp = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    // If the backend returns 401 and we are on an admin page, force logout
    if (resp.status === 401 && window.location.pathname.includes('/admin/')) {
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
    }
    // For other errors, still return the JSON so callers can handle them
    return resp.json();
}

/**
 * Public: fetch a list of media (used by gallery and detail pages).
 * @param {Object} params - { year_id, limit, skip, search, category, etc. }
 */
export async function fetchMedia(params = {}) {
    const query = new URLSearchParams();
    if (params.year_id) query.set('year_id', params.year_id);
    if (params.limit) query.set('limit', params.limit);
    if (params.skip) query.set('skip', params.skip);
    if (params.category) query.set('category', params.category);
    if (params.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE}/media?${query}`);
    if (!res.ok) throw new Error('Failed to fetch media');
    const data = await res.json();
    // The public /media endpoint returns { success: true, data: [...] }
    return data;
}

/**
 * Public: fetch a single media item by ID.
 * @param {number} id
 */
export async function fetchMediaById(id) {
    const res = await fetch(`${API_BASE}/media/${id}`);
    if (!res.ok) throw new Error('Media not found');
    const data = await res.json();
    // The endpoint returns { success: true, data: { ... } }
    return data.data || data;
}
