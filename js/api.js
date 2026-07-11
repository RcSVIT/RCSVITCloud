const API_BASE = 'https://rcsvitcloud.onrender.com/api';

export async function apiFetch(endpoint, options = {}) {
    const adminToken = localStorage.getItem('admin_token');
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (adminToken && !endpoint.startsWith('/auth')) {
        headers['Authorization'] = `Bearer ${adminToken}`;
    }
    const resp = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (resp.status === 401 && window.location.pathname.includes('/admin/')) {
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
    }
    return resp.json();
}

export async function fetchMedia(params = {}) {
    if (params.type === 'years') {
        const res = await fetch(`${API_BASE}/media/years`);
        return res.json();
    }
    const query = new URLSearchParams();
    if (params.year_id) query.set('year_id', params.year_id);
    if (params.limit) query.set('limit', params.limit);
    if (params.skip) query.set('skip', params.skip);
    const res = await fetch(`${API_BASE}/media?${query}`);
    if (!res.ok) throw new Error('Failed to fetch media');
    return res.json();
}

export async function fetchMediaById(id) {
    const res = await fetch(`${API_BASE}/media/${id}`);
    if (!res.ok) throw new Error('Media not found');
    const data = await res.json();
    return data.data || data;
}
