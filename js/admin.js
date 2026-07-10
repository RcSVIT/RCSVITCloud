import { apiFetch } from './api.js';

const CLOUDINARY_CLOUD_NAME = 'jypxyqtu';
const token = localStorage.getItem('admin_token');
if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
}

// ── Tab switching ──
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

// ── Upload drop zone ──
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });
}
document.getElementById('removeFile')?.addEventListener('click', resetFile);
document.getElementById('uploadForm')?.addEventListener('submit', handleUpload);
document.getElementById('addYearBtn')?.addEventListener('click', () => {
    document.getElementById('addYearModal').classList.add('active');
});
document.getElementById('createYearBtn')?.addEventListener('click', createYear);
document.getElementById('yearCoverFile')?.addEventListener('change', function() {
    const file = this.files[0];
    const preview = document.getElementById('yearCoverPreview');
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
});
document.getElementById('addAdminBtn')?.addEventListener('click', addAdmin);
document.getElementById('saveEditBtn')?.addEventListener('click', saveEdit);

// ── File handling ──
let selectedFile = null;
function handleFileSelect() {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
        showUploadMessage('File exceeds 10 MB limit.', 'error');
        resetFile();
        return;
    }
    selectedFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatBytes(file.size);
    dropZone.style.display = 'none';
    document.getElementById('filePreview').style.display = 'flex';
    const preview = document.getElementById('previewContainer');
    preview.innerHTML = '';
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        preview.appendChild(img);
    } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.muted = true;
        preview.appendChild(video);
    }
}

function resetFile() {
    selectedFile = null;
    fileInput.value = '';
    dropZone.style.display = 'block';
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('previewContainer').innerHTML = '';
}

function formatBytes(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showUploadMessage(msg, type) {
    const div = document.getElementById('uploadMessage');
    div.textContent = msg;
    div.className = 'message message-' + type;
}

async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile) { showUploadMessage('Please select a file.', 'error'); return; }
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    let fakeWidth = 0;
    const interval = setInterval(() => {
        if (fakeWidth < 90) {
            fakeWidth += Math.random() * 15 + 5;
            progressFill.style.width = Math.min(fakeWidth, 90) + '%';
        }
    }, 250);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('upload_preset', 'club_unsigned');
    try {
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData });
        const cloudData = await uploadRes.json();
        if (!cloudData.secure_url) throw new Error('Cloudinary upload failed');
        const payload = {
            year_id: parseInt(document.getElementById('upload-year').value),
            title: document.getElementById('title').value || selectedFile.name,
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            country: document.getElementById('country').value,
            source: document.getElementById('source').value,
            capture_date: document.getElementById('capture_date').value,
            resolution: document.getElementById('resolution').value,
            tags: document.getElementById('tags').value,
            cloudinary_public_id: cloudData.public_id,
            cloudinary_url: cloudData.secure_url,
            media_type: cloudData.resource_type,
            file_size: selectedFile.size
        };
        await apiFetch('/admin/media', { method: 'POST', body: JSON.stringify(payload) });
        clearInterval(interval);
        progressFill.style.width = '100%';
        showUploadMessage('✅ Upload successful!', 'success');
        resetFile();
        setTimeout(() => { progressBar.style.display = 'none'; }, 1000);
    } catch (e) {
        clearInterval(interval);
        showUploadMessage('Error: ' + e.message, 'error');
    }
}

async function loadYearsDropdown() {
    const data = await apiFetch('/admin/years');
    const years = data.data || [];
    const select = document.getElementById('upload-year');
    if (select) select.innerHTML = years.map(y => `<option value="${y.id}">${y.year}</option>`).join('');
}

// ── Dashboard stats (real data) ──
async function loadDashboard() {
    try {
        const stats = await apiFetch('/stats/dashboard');
        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card"><div class="number">${stats.total_media}</div><div class="label">Total Media</div></div>
            <div class="stat-card"><div class="number">${(stats.storage_bytes/1024/1024).toFixed(1)} MB</div><div class="label">Storage (All)</div></div>
            <div class="stat-card"><div class="number">${stats.total_years}</div><div class="label">Years</div></div>
            <div class="stat-card"><div class="number">${stats.total_views}</div><div class="label">Views</div></div>
            <div class="stat-card"><div class="number">${stats.total_shares}</div><div class="label">Shares</div></div>
        `;
        document.getElementById('visitorStatsGrid').innerHTML = `
            <div class="stat-card"><div class="number">${stats.visitors_today}</div><div class="label">Visitors Today</div></div>
            <div class="stat-card"><div class="number">${stats.visitors_month}</div><div class="label">This Month</div></div>
            <div class="stat-card"><div class="number">${stats.visitors_year}</div><div class="label">This Year</div></div>
        `;
        document.getElementById('infraStatsGrid').innerHTML = `
            <div class="stat-card">
                <div class="number" style="color:green;">${stats.render_status}</div>
                <div class="label">Render Status</div>
            </div>
            <div class="stat-card">
                <div class="number">${stats.cloudinary_usage_mb} MB</div>
                <div class="label">Cloudinary Used</div>
            </div>
            <div class="stat-card">
                <div class="number">${stats.d1_storage_mb !== null ? stats.d1_storage_mb + ' MB' : 'N/A'}</div>
                <div class="label">D1 Storage</div>
            </div>
            <div class="stat-card">
                <div class="number">${stats.d1_requests_monthly !== null ? stats.d1_requests_monthly.toLocaleString() : 'N/A'}</div>
                <div class="label">D1 Requests</div>
            </div>
        `;
        new Chart(document.getElementById('viewsChart'), {
            type: 'bar',
            data: {
                labels: stats.top_views.map(m => m.title?.substring(0,20) || 'Untitled'),
                datasets: [{ label: 'Views', data: stats.top_views.map(m => m.views_count||0), backgroundColor: '#000' }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
        new Chart(document.getElementById('sharesChart'), {
            type: 'bar',
            data: {
                labels: stats.top_shares.map(m => m.title?.substring(0,20) || 'Untitled'),
                datasets: [{ label: 'Shares', data: stats.top_shares.map(m => m.shares_count||0), backgroundColor: '#000' }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    } catch (e) { document.getElementById('statsGrid').innerHTML = '<p>Failed to load stats.</p>'; }
}

// ── Manage Media Tab (grouped by year) ──
async function loadManageTab() {
    const container = document.getElementById('mediaByYear');
    container.innerHTML = '<p>Loading…</p>';
    try {
        const yearsData = await apiFetch('/admin/years');
        const years = yearsData.data || [];
        const mediaData = await apiFetch('/admin/media?limit=500');
        const media = mediaData.data || [];
        const grouped = {};
        years.forEach(y => { grouped[y.id] = { year: y, media: [] }; });
        media.forEach(m => {
            if (grouped[m.year_id]) grouped[m.year_id].media.push(m);
        });
        container.innerHTML = years.map(y => {
            const yearMedia = grouped[y.id]?.media || [];
            return `
            <div class="year-group">
                <div class="year-header" onclick="toggleYear(this)">
                    <h4>${y.year} (${yearMedia.length} items)</h4>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="year-media">
                    ${yearMedia.length === 0 ? '<p>No media</p>' : `
                    <table>
                        <thead><tr><th>Preview</th><th>Title</th><th>Type</th><th>Views</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${yearMedia.map(m => `
                                <tr>
                                    <td>${m.media_type === 'video' ? `<video src="${m.cloudinary_url}" muted style="width:60px;height:45px;"></video>` : `<img src="${m.cloudinary_url}" style="width:60px;height:45px;">`}</td>
                                    <td>${m.title}</td>
                                    <td>${m.media_type}</td>
                                    <td>${m.views_count || 0}</td>
                                    <td>
                                        <button class="btn btn-outline" onclick="openEditModal(${m.id}, '${m.title.replace(/'/g, "\\'")}', '${(m.description||'').replace(/'/g, "\\'")}', '${(m.category||'').replace(/'/g, "\\'")}', '${(m.country||'').replace(/'/g, "\\'")}', '${(m.source||'').replace(/'/g, "\\'")}', '${(m.capture_date||'').replace(/'/g, "\\'")}', '${(m.resolution||'').replace(/'/g, "\\'")}', '${(m.tags||'').replace(/'/g, "\\'")}')">Edit</button>
                                        <button class="btn btn-danger" onclick="deleteMedia(${m.id})">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`}
                </div>
            </div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<p>Failed to load media.</p>';
    }
}

window.toggleYear = function(header) {
    const mediaDiv = header.nextElementSibling;
    const icon = header.querySelector('i');
    mediaDiv.classList.toggle('open');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
};

window.openEditModal = function(id, title, description, category, country, source, capture_date, resolution, tags) {
    document.getElementById('edit-media-id').value = id;
    document.getElementById('edit-title').value = title;
    document.getElementById('edit-description').value = description;
    document.getElementById('edit-category').value = category;
    document.getElementById('edit-country').value = country;
    document.getElementById('edit-source').value = source;
    document.getElementById('edit-capture_date').value = capture_date;
    document.getElementById('edit-resolution').value = resolution;
    document.getElementById('edit-tags').value = tags;
    document.getElementById('editMediaModal').classList.add('active');
};

window.saveEdit = async function() {
    const id = document.getElementById('edit-media-id').value;
    const payload = {
        title: document.getElementById('edit-title').value,
        description: document.getElementById('edit-description').value,
        category: document.getElementById('edit-category').value,
        country: document.getElementById('edit-country').value,
        source: document.getElementById('edit-source').value,
        capture_date: document.getElementById('edit-capture_date').value,
        resolution: document.getElementById('edit-resolution').value,
        tags: document.getElementById('edit-tags').value
    };
    try {
        await apiFetch(`/admin/media/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        document.getElementById('editMediaModal').classList.remove('active');
        loadManageTab();
        loadDashboard();
    } catch (e) { alert('Error updating media'); }
};

window.deleteMedia = async function(id) {
    if (!confirm('Delete permanently?')) return;
    await apiFetch(`/admin/media/${id}`, { method: 'DELETE' });
    loadManageTab();
    loadDashboard();
};

// ── Manage Years Tab ──
async function loadYearsTab() {
    const tbody = document.getElementById('yearsTableBody');
    tbody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    const data = await apiFetch('/admin/years');
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
}
window.editYear = function(id, currentName) {
    const newName = prompt('New president name:', currentName);
    if (newName !== null) {
        apiFetch(`/admin/years/${id}`, { method: 'PUT', body: JSON.stringify({ president_name: newName }) })
            .then(() => { loadYearsTab(); loadYearsDropdown(); })
            .catch(() => alert('Error updating'));
    }
};
window.deleteYear = async function(id) {
    if (!confirm('Delete year and all its media?')) return;
    await apiFetch(`/admin/years/${id}`, { method: 'DELETE' });
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
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.secure_url) return alert('Cover upload failed');
        coverUrl = data.secure_url;
    }
    await apiFetch('/admin/years', {
        method: 'POST',
        body: JSON.stringify({ year: parseInt(year), president_name: president, cover_image: coverUrl })
    });
    alert('Year created');
    document.getElementById('addYearModal').classList.remove('active');
    loadYearsTab();
    loadYearsDropdown();
    loadDashboard();
}

// ── Manage Admins Tab ──
async function loadAdminsTab() {
    const container = document.getElementById('adminsList');
    try {
        const data = await apiFetch('/admin/users/');
        const admins = data || [];
        if (!Array.isArray(admins)) {
            container.innerHTML = '<p>Only super admins can manage users.</p>';
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
    await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
    loadAdminsTab();
};

async function addAdmin() {
    const email = document.getElementById('newAdminEmail').value;
    const password = document.getElementById('newAdminPassword').value;
    const role = document.getElementById('newAdminRole').value;
    if (!email || !password) return alert('Fill all fields');
    await apiFetch('/admin/users/', { method: 'POST', body: JSON.stringify({ email, password, role }) });
    alert('Admin added');
    loadAdminsTab();
}

// ── Logout ──
function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = 'login.html';
}
