import { apiFetch } from './api.js';

// CHANGE THIS: Your Cloudinary cloud name
const CLOUDINARY_CLOUD_NAME = 'jypxyqtu';

// --- Login ---
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const msgDiv = document.getElementById('message');

    // Show loading spinner
    btn.classList.add('loading');
    btn.disabled = true;
    msgDiv.textContent = '';
    msgDiv.className = 'message';

    try {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.access_token) {
            localStorage.setItem('admin_token', data.access_token);
            msgDiv.textContent = 'Login successful! Redirecting…';
            msgDiv.className = 'message message-success';
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            msgDiv.textContent = 'Login failed – please check your credentials.';
            msgDiv.className = 'message message-error';
        }
    } catch (e) {
        msgDiv.textContent = 'Network error – please try again.';
        msgDiv.className = 'message message-error';
    } finally {
        // Stop loading spinner
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// --- Dashboard ---
async function loadDashboard() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    try {
        const stats = await apiFetch('/stats/dashboard');
        document.getElementById('total-media').textContent = stats.total_media || 0;
        document.getElementById('total-storage').textContent = (stats.storage_bytes / (1024 * 1024)).toFixed(2) + ' MB';
        document.getElementById('total-views').textContent = stats.total_views || 0;
        document.getElementById('total-shares').textContent = stats.total_shares || 0;
        document.getElementById('total-years').textContent = stats.total_years || 0;
        document.getElementById('visitors-today').textContent = stats.visitors_today || 0;
        document.getElementById('visitors-month').textContent = stats.visitors_month || 0;
        document.getElementById('visitors-year').textContent = stats.visitors_year || 0;

        new Chart(document.getElementById('viewsChart'), {
            type: 'bar',
            data: {
                labels: stats.top_views.map(m => m.title || 'Untitled'),
                datasets: [{ label: 'Views', data: stats.top_views.map(m => m.views_count || 0), backgroundColor: '#000' }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
        new Chart(document.getElementById('sharesChart'), {
            type: 'bar',
            data: {
                labels: stats.top_shares.map(m => m.title || 'Untitled'),
                datasets: [{ label: 'Shares', data: stats.top_shares.map(m => m.shares_count || 0), backgroundColor: '#000' }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });

        loadMediaTable();
        loadYearsDropdown();
        loadAdmins();
    } catch (e) {
        alert('Error loading dashboard');
    }
}

async function loadMediaTable() {
    const data = await apiFetch('/admin/media?limit=100');
    const media = data.data || [];
    const tbody = document.getElementById('media-table-body');
    tbody.innerHTML = media.map(m => `
        <tr>
            <td>${m.title || 'Untitled'}</td>
            <td>${m.media_type}</td>
            <td>${m.views_count || 0}</td>
            <td><button onclick="deleteMedia('${m.id}')" class="btn btn-danger" style="padding:4px 12px;">Delete</button></td>
        </tr>
    `).join('');
}

window.deleteMedia = async function(id) {
    if (!confirm('Delete permanently?')) return;
    await apiFetch(`/admin/media/${id}`, { method: 'DELETE' });
    loadMediaTable();
    loadDashboard();
};

async function loadYearsDropdown() {
    const data = await apiFetch('/admin/years');
    const years = data.data || [];
    const select = document.getElementById('upload-year');
    select.innerHTML = years.map(y => `<option value="${y.id}">${y.year}</option>`).join('');
}

async function loadAdmins() {
    // FIXED: added trailing slash to match backend route
    const data = await apiFetch('/admin/users/');
    const admins = data || [];   // response is directly the list (due to response_model)
    const container = document.getElementById('admins-list');
    container.innerHTML = admins.map(a => `
        <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #f1f5f9;">
            <span>${a.email} (${a.role})</span>
            <button onclick="deleteAdmin('${a.id}')" class="btn btn-danger" style="padding:4px 12px;">Remove</button>
        </div>
    `).join('');
}

window.deleteAdmin = async function(id) {
    if (!confirm('Remove this admin?')) return;
    await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
    loadAdmins();
};

// --- Upload ---
async function uploadMedia() {
    const file = document.getElementById('upload-file').files[0];
    if (!file) return alert('Select a file');
    const title = document.getElementById('upload-title').value;
    const description = document.getElementById('upload-desc').value;
    const captureDate = document.getElementById('upload-capture-date').value;
    const location = document.getElementById('upload-location').value;
    const people = document.getElementById('upload-people').value;
    const event = document.getElementById('upload-event').value;
    const tags = document.getElementById('upload-tags').value;
    const yearId = document.getElementById('upload-year').value;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'club_unsigned'); // Must exist in Cloudinary

    try {
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
            method: 'POST',
            body: formData
        });
        const cloudData = await uploadRes.json();
        if (!cloudData.secure_url) throw new Error('Cloudinary upload failed');

        const payload = {
            year_id: yearId,
            title: title || file.name,
            description: description,
            capture_date: captureDate || null,
            upload_date: new Date().toISOString().split('T')[0],
            location: location || null,
            people: people || null,
            event: event || null,
            tags: tags || null,
            cloudinary_public_id: cloudData.public_id,
            cloudinary_url: cloudData.secure_url,
            media_type: cloudData.resource_type,
            file_size: file.size,
            parent_id: null,
            sort_order: 0
        };
        await apiFetch('/admin/media', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        alert('Upload successful!');
        document.getElementById('upload-modal').classList.remove('active');
        loadMediaTable();
        loadDashboard();
    } catch (e) {
        alert(`Upload error: ${e.message}`);
    }
}

// --- Create year ---
async function createYear() {
    const year = document.getElementById('new-year').value;
    const president = document.getElementById('new-president').value;
    if (!year) return alert('Enter a year');
    await apiFetch('/admin/years', {
        method: 'POST',
        body: JSON.stringify({ year: parseInt(year), president_name: president || null })
    });
    alert('Year created');
    document.getElementById('new-year').value = '';
    document.getElementById('new-president').value = '';
    loadYearsDropdown();
    loadDashboard();
}

// --- Logout ---
function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = 'login.html';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('login-form')) {
        document.getElementById('login-form').addEventListener('submit', handleLogin);
    }
    if (document.getElementById('dashboard-container')) {
        loadDashboard();
        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('upload-modal').classList.add('active');
        });
        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('upload-modal').classList.remove('active');
        });
        document.getElementById('confirm-upload').addEventListener('click', uploadMedia);
        document.getElementById('create-year-btn').addEventListener('click', createYear);
        document.getElementById('logout-btn').addEventListener('click', logout);
        document.getElementById('add-admin-btn').addEventListener('click', async () => {
            const email = document.getElementById('new-admin-email').value;
            const password = document.getElementById('new-admin-password').value;
            const role = document.getElementById('new-admin-role').value;
            if (!email || !password) return alert('Fill all fields');
            await apiFetch('/admin/users/', {
                method: 'POST',
                body: JSON.stringify({ email, password, role })
            });
            alert('Admin added');
            loadAdmins();
        });
    }
});
