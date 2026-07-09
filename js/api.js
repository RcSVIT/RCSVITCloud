export const API_BASE = 'https://your-app.onrender.com/api';
let adminToken = localStorage.getItem('admin_token');

export async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if (adminToken && !endpoint.startsWith('/auth')) {
        headers['Authorization'] = `Bearer ${adminToken}`;
    }
    const resp = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    if (resp.status === 401) {
        if (window.location.pathname.includes('/admin/')) {
            localStorage.removeItem('admin_token');
            window.location.href = 'login.html';
        }
        throw new Error('Unauthorized');
    }
    return resp.json();
}
