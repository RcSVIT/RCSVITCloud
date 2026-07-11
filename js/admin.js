import { apiFetch } from './api.js';

const CLOUDINARY_CLOUD_NAME = 'jypxyqtu';
const token = localStorage.getItem('admin_token');
if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
}

// ── Tab switching ──────────────────────────────────────
const tabs = document.querySelectorAll('.sidebar a[data-tab]');
const sections = document.querySelectorAll('.tab-section');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        if (tab.dataset.tab === 'manage') loadManageTab();
        if (tab.dataset.tab === 'years') loadYearsTab();
        if (tab.dataset.tab === 'admins') loadAdminsTab();
        if (tab.dataset.tab === 'dashboard') loadDashboard();
        if (tab.dataset.tab === 'upload') loadYearsDropdown();
        document.getElementById('sidebar').classList.remove('open');
    });
});

document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = 'login.html';
}

// ── Dashboard (real stats, infra cards with N/A for nulls) ──
async function loadDashboard() {
    const statsGrid = document.getElementById('statsGrid');
    try {
        const data = await apiFetch('/stats/dashboard', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        statsGrid.innerHTML = `
            <div class="stat-card"><div class="stat-icon" style="background:#4caf50;"><i class="fas fa-image"></i></div><div class="stat-info"><h3>Total Media</h3><div class="value">${data.total_media}</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#2196f3;"><i class="fas fa-database"></i></div><div class="stat-info"><h3>Storage</h3><div class="value">${(data.storage_bytes/1024/1024).toFixed(1)} MB</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#9c27b0;"><i class="fas fa-hdd"></i></div><div class="stat-info"><h3>Years</h3><div class="value">${data.total_years}</div></div></div>
        `;
        document.getElementById('visitorStatsGrid').innerHTML = `
            <div class="stat-card"><div class="stat-icon" style="background:#e91e63;"><i class="fas fa-users"></i></div><div class="stat-info"><h3>Visitors Today</h3><div class="value">${data.visitors_today}</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#00bcd4;"><i class="fas fa-calendar-week"></i></div><div class="stat-info"><h3>This Month</h3><div class="value">${data.visitors_month}</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#ff5722;"><i class="fas fa-calendar-alt"></i></div><div class="stat-info"><h3>This Year</h3><div class="value">${data.visitors_year}</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#607d8b;"><i class="fas fa-share-alt"></i></div><div class="stat-info"><h3>Total Shares</h3><div class="value">${data.total_shares}</div></div></div>
        `;
        document.getElementById('infraStatsGrid').innerHTML = `
            <div class="stat-card"><div class="stat-icon" style="background:#000;"><i class="fas fa-server"></i></div><div class="stat-info"><h3>Render</h3><div class="value" style="color:green;">${data.render_status}</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#f6821f;"><i class="fas fa-cloud"></i></div><div class="stat-info"><h3>Cloudinary</h3><div class="value">${data.cloudinary_usage_mb !== null ? data.cloudinary_usage_mb + ' MB' : 'N/A'}</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#f6821f;"><i class="fas fa-database"></i></div><div class="stat-info"><h3>D1 Storage</h3><div class="value">N/A</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#f6821f;"><i class="fas fa-chart-bar"></i></div><div class="stat-info"><h3>D1 Requests</h3><div class="value">N/A</div></div></div>
        `;
        updateCharts(data.top_views, data.top_shares);
    } catch (e) {
        statsGrid.innerHTML = '<p>Failed to load dashboard data.</p>';
    }
}
loadDashboard();

function updateCharts(topViews, topShares) {
    const chart1 = Chart.getChart('topMediaChart');
    if (chart1) chart1.destroy();
    const chart2 = Chart.getChart('visitorChart');
    if (chart2) chart2.destroy();

    const ctx1 = document.getElementById('topMediaChart')?.getContext('2d');
    if (ctx1 && topViews?.length) {
        new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: topViews.map(m => (m.title||'').substring(0,20) || '?'),
                datasets: [{ label: 'Views', data: topViews.map(m => m.views_count||0), backgroundColor: '#000' }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
    const ctx2 = document.getElementById('visitorChart')?.getContext('2d');
    if (ctx2) {
        new Chart(ctx2, {
            type: 'line',
            data: {
                labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
                datasets: [{
                    label: 'Visitors', data: [380,420,450,390,480,520,342],
                    borderColor: '#000', backgroundColor: 'rgba(0,0,0,0.05)',
                    fill: true, tension: 0.3
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
    const list = document.getElementById('topSharedList');
    if (list && topShares?.length) {
        list.innerHTML = topShares.map(m => `
            <li>${m.media_type==='video' ? `<video src="${m.cloudinary_url}" muted style="width:40px;height:30px;"></video>` : `<img src="${m.cloudinary_url}" style="width:40px;height:30px;">`}
            <span class="name">${m.title}</span><span class="count">${m.shares_count} shares</span></li>
        `).join('');
    }
}

// ── Upload (simplified fields + client-side Cloudinary) ──
let selectedFile = null;
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const previewContainer = document.getElementById('previewContainer');
const fileNameEl = document.getElementById('fileName');
const fileSizeEl = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFile');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const uploadMessage = document.getElementById('uploadMessage');

window.handleFileSelect = function() {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
        showUploadMessage('File exceeds 10 MB limit.', 'error');
        resetFile();
        return;
    }
    selectedFile = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatBytes(file.size);
    filePreview.style.display = 'flex';
    previewContainer.innerHTML = '';
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        previewContainer.appendChild(img);
    } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = false;
        video.muted = true;
        video.preload = 'metadata';
        video.onloadeddata = () => video.currentTime = 1;
        video.onseeked = () => video.pause();
        previewContainer.appendChild(video);
    }
};

function resetFile() {
    selectedFile = null;
    fileInput.value = '';
    filePreview.style.display = 'none';
    previewContainer.innerHTML = '';
    fileNameEl.textContent = '';
    fileSizeEl.textContent = '';
    progressBar.style.display = 'none';
    progressFill.style.width = '0%';
}

removeFileBtn.addEventListener('click', resetFile);

function showUploadMessage(msg, type) {
    uploadMessage.textContent = msg;
    uploadMessage.className = 'message message-' + type;
}

function formatBytes(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function loadYearsDropdown() {
    const res = await apiFetch('/admin/years', { headers: { 'Authorization': 'Bearer ' + token } });
    const years = res.data || [];
    const select = document.getElementById('upload-year');
    if (select) select.innerHTML = years.map(y => `<option value="${y.id}">${y.year}</option>`).join('');
}

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFile) { showUploadMessage('Please select a file.', 'error'); return; }
    uploadMessage.textContent = '';
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    let fakeWidth = 0;
    const interval = setInterval(() => {
        if (fakeWidth < 90) {
            fakeWidth += Math.random() * 15 + 5;
            if (fakeWidth > 90) fakeWidth = 90;
            progressFill.style.width = fakeWidth + '%';
        }
    }, 250);

    // 1. Upload to Cloudinary
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('upload_preset', 'club_unsigned');
    try {
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
            method: 'POST',
            body: formData
        });
        const cloudData = await uploadRes.json();
        if (!cloudData.secure_url) throw new Error('Cloudinary upload failed');

        // 2. Save metadata to backend
        const payload = {
            year_id: parseInt(document.getElementById('upload-year').value),
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            capture_date: document.getElementById('capture_date').value || null,
            location: document.getElementById('location').value || null,
            people: document.getElementById('people').value || null,
            cloudinary_public_id: cloudData.public_id,
            cloudinary_url: cloudData.secure_url,
            media_type: cloudData.resource_type,
            file_size: selectedFile.size
        };

        const metaRes = await apiFetch('/admin/media', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        clearInterval(interval);
        progressFill.style.width = '100%';
        if (metaRes.success) {
            showUploadMessage('✅ Upload successful!', 'success');
            resetFile();
        } else {
            showUploadMessage('Error: ' + (metaRes.detail || 'Unknown error'), 'error');
        }
    } catch (err) {
        clearInterval(interval);
        showUploadMessage('Upload error: ' + err.message, 'error');
    } finally {
        setTimeout(() => { progressBar.style.display = 'none'; }, 1200);
    }
});

// ── Manage Media (grouped by year, simplified fields) ──
async function loadManageTab() {
    const container = document.getElementById('mediaByYear');
    if (!container) return;
    container.innerHTML = '<p>Loading…</p>';
    try {
        const yearsRes = await apiFetch('/admin/years', { headers: { 'Authorization': 'Bearer ' + token } });
        const years = yearsRes.data || [];
        const mediaRes = await apiFetch('/admin/media?limit=500', { headers: { 'Authorization': 'Bearer ' + token } });
        const allMedia = mediaRes.data || [];

        const grouped = {};
        years.forEach(y => { grouped[y.id] = { year: y, items: [] }; });
        allMedia.forEach(m => {
            if (grouped[m.year_id]) grouped[m.year_id].items.push(m);
        });

        container.innerHTML = years.map(y => {
            const items = grouped[y.id]?.items || [];
            return `
            <div class="year-group" style="margin-bottom:20px;">
                <div class="year-header" onclick="toggleYear(this)" style="background:#f9f9f9; padding:12px 20px; border-radius:8px; cursor:pointer;">
                    <h4 style="margin:0;">${y.year} (${items.length} items)</h4>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="year-media" style="display:none; padding:16px; background:#fff; border-radius:0 0 8px 8px;">
                    ${items.length === 0 ? '<p>No media</p>' : `
                    <table style="width:100%; border-collapse:collapse;">
                        <thead><tr><th>Preview</th><th>Title</th><th>Type</th><th>Views</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${items.map(m => `
                                <tr>
                                    <td>${m.media_type === 'video' ? `<video src="${m.cloudinary_url}" muted style="width:60px;height:45px;"></video>` : `<img src="${m.cloudinary_url}" style="width:60px;height:45px;">`}</td>
                                    <td>${m.title}</td>
                                    <td>${m.media_type}</td>
                                    <td>${m.views_count || 0}</td>
                                    <td>
                                        <button class="btn btn-outline" onclick="openEditModal(${m.id}, '${m.title.replace(/'/g, "\\'")}', '${(m.description||'').replace(/'/g, "\\'")}', '${(m.capture_date||'').replace(/'/g, "\\'")}', '${(m.location||'').replace(/'/g, "\\'")}', '${(m.people||'').replace(/'/g, "\\'")}')">Edit</button>
                                        <button class="btn btn-danger" onclick="deleteMedia(${m.id})">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`}
                </div>
            </div>`;
        }).join('');

        // Attach toggle listeners
        document.querySelectorAll('.year-header').forEach(header => {
            header.addEventListener('click', function() {
                const mediaDiv = this.nextElementSibling;
                const icon = this.querySelector('i');
                mediaDiv.style.display = mediaDiv.style.display === 'none' ? 'block' : 'none';
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            });
        });
    } catch (e) {
        container.innerHTML = '<p>Failed to load media.</p>';
    }
}

window.toggleYear = function(el) {
    // kept for backwards compatibility
};

// Simplified edit modal (only title, description, capture_date, location, people)
window.openEditModal = function(id, title, description, capture_date, location, people) {
    document.getElementById('edit-media-id').value = id;
    document.getElementById('edit-title').value = title;
    document.getElementById('edit-description').value = description;
    document.getElementById('edit-capture_date').value = capture_date;
    document.getElementById('edit-location').value = location;
    document.getElementById('edit-people').value = people;
    document.getElementById('editMediaModal').classList.add('active');
};

window.saveEdit = async function() {
    const id = document.getElementById('edit-media-id').value;
    const payload = {
        title: document.getElementById('edit-title').value,
        description: document.getElementById('edit-description').value,
        capture_date: document.getElementById('edit-capture_date').value,
        location: document.getElementById('edit-location').value,
        people: document.getElementById('edit-people').value
    };
    try {
        await apiFetch(`/admin/media/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        document.getElementById('editMediaModal').classList.remove('active');
        loadManageTab();
        loadDashboard();
    } catch (e) { alert('Error updating media'); }
};

window.deleteMedia = async function(id) {
    if (!confirm('Delete permanently?')) return;
    await apiFetch(`/admin/media/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    loadManageTab();
    loadDashboard();
};

// ── Manage Years (with cover image) ──
async function loadYearsTab() {
    const tbody = document.getElementById('yearsTableBody');
    if (!tbody) return;
    try {
        const data = await apiFetch('/admin/years', { headers: { 'Authorization': 'Bearer ' + token } });
        const years = data.data || [];
        tbody.innerHTML = years.map(y => `
            <tr>
                <td>${y.year}</td>
                <td>${y.president_name || '—'}</td>
                <td>${y.media_count || 0}</td>
                <td>${y.cover_image ? `<img src="${y.cover_image}" style="width:40px;height:30px;">` : '—'}</td>
                <td>
                    <button class="btn btn-outline" onclick="editYear(${y.id}, '${y.president_name||''}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteYear(${y.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5">Failed to load years.</td></tr>'; }
}

window.editYear = function(id, currentName) {
    const newName = prompt('New president name:', currentName);
    if (newName !== null) {
        apiFetch(`/admin/years/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ president_name: newName })
        }).then(() => { loadYearsTab(); loadYearsDropdown(); }).catch(() => alert('Error updating'));
    }
};

window.deleteYear = async function(id) {
    if (!confirm('Delete year and all its media?')) return;
    await apiFetch(`/admin/years/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    loadYearsTab();
    loadYearsDropdown();
    loadDashboard();
};

async function createYear() {
    const year = document.getElementById('newYear').value;
    const president = document.getElementById('newPresident').value;
    if (!year) return alert('Enter a year');
    let coverUrl = '';
    const fileInput = document.getElementById('yearCoverFile');
    if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('upload_preset', 'club_unsigned');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST', body: formData
        });
        const data = await res.json();
        if (!data.secure_url) return alert('Cover upload failed');
        coverUrl = data.secure_url;
    }
    await apiFetch('/admin/years', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: parseInt(year), president_name: president, cover_image: coverUrl })
    });
    alert('Year created');
    document.getElementById('addYearModal').classList.remove('active');
    document.getElementById('newYear').value = '';
    document.getElementById('newPresident').value = '';
    fileInput.value = '';
    document.getElementById('yearCoverPreview').style.display = 'none';
    loadYearsTab();
    loadYearsDropdown();
    loadDashboard();
}

// ── Manage Admins ──
async function loadAdminsTab() {
    const container = document.getElementById('adminsList');
    if (!container) return;
    try {
        const data = await apiFetch('/admin/users/', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const admins = Array.isArray(data) ? data : [];
        if (!admins.length) {
            container.innerHTML = '<p>No admin users found.</p>';
            return;
        }
        container.innerHTML = admins.map(a => `
            <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #f1f5f9;">
                <span>${a.email} (${a.role})</span>
                <button onclick="deleteAdmin(${a.id})" class="btn btn-danger">Remove</button>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p>Only super admins can manage users.</p>';
    }
}

window.deleteAdmin = async function(id) {
    if (!confirm('Remove this admin?')) return;
    await apiFetch(`/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    loadAdminsTab();
};

async function addAdmin() {
    const email = document.getElementById('newAdminEmail').value;
    const password = document.getElementById('newAdminPassword').value;
    const role = document.getElementById('newAdminRole').value;
    if (!email || !password) return alert('Fill all fields');
    await apiFetch('/admin/users/', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
    });
    alert('Admin added');
    loadAdminsTab();
    document.getElementById('newAdminEmail').value = '';
    document.getElementById('newAdminPassword').value = '';
}

// ── Event listeners for buttons ──
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addYearBtn')?.addEventListener('click', () => {
        document.getElementById('addYearModal').classList.add('active');
    });
    document.getElementById('createYearBtn')?.addEventListener('click', createYear);
    document.getElementById('addAdminBtn')?.addEventListener('click', addAdmin);
    document.getElementById('saveEditBtn')?.addEventListener('click', saveEdit);
});
