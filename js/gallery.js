import { apiFetch } from './api.js';

// CHANGE THIS: Your GitHub Pages URL
const GITHUB_PAGES_URL = 'https://your-github-username.github.io';

async function loadYears() {
    const container = document.getElementById('year-grid');
    if (!container) return;
    try {
        const data = await apiFetch('/media/years');
        const years = data.data || [];
        container.innerHTML = years.map(year => `
            <a href="gallery.html?year=${year.id}" class="year-card">
                <div class="year-number">${year.year}</div>
                <div class="president">${year.president_name || 'President'}</div>
                <div class="media-count">${year.media_count || 0} items</div>
            </a>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p>Error loading years.</p>';
    }
}

async function loadGallery() {
    const params = new URLSearchParams(window.location.search);
    const yearId = params.get('year');
    if (!yearId) {
        document.body.innerHTML = '<p>No year selected.</p>';
        return;
    }
    const grid = document.getElementById('gallery-grid');
    try {
        const data = await apiFetch(`/media?year_id=${yearId}&limit=100`);
        const media = data.data || [];
        if (!media.length) {
            grid.innerHTML = '<p>No media for this year.</p>';
            return;
        }
        grid.innerHTML = media.map(item => `
            <div class="media-card" onclick="location.href='detail.html?id=${item.id}'">
                <div class="thumbnail">
                    ${item.media_type === 'video'
                        ? `<video src="${item.cloudinary_url}" muted></video>`
                        : `<img src="${item.cloudinary_url}" alt="${item.title || 'Media'}" loading="lazy">`
                    }
                </div>
                <div class="info">
                    <div class="title">${item.title || 'Untitled'}</div>
                    <div class="meta">👁 ${item.views_count} · ⤴ ${item.shares_count}</div>
                </div>
            </div>
        `).join('');
        await apiFetch('/media/visitor', { method: 'POST' }).catch(() => {});
    } catch (e) {
        grid.innerHTML = '<p>Failed to load media.</p>';
    }
}

async function loadDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    try {
        const data = await apiFetch(`/media/${id}`);
        const item = data.data;
        await apiFetch(`/media/${id}/view`, { method: 'POST' }).catch(() => {});

        const container = document.getElementById('detail-container');
        const mediaHtml = item.media_type === 'video'
            ? `<video class="media-display" src="${item.cloudinary_url}" controls autoplay></video>`
            : `<img class="media-display" src="${item.cloudinary_url}" alt="${item.title}">`;
        container.innerHTML = `
            <h2>${item.title || 'Untitled'}</h2>
            <p>${item.description || ''}</p>
            ${mediaHtml}
            <div class="detail-meta">
                <div><span class="label">Year</span> ${item.year_id}</div>
                <div><span class="label">Capture Date</span> ${item.capture_date || '—'}</div>
                <div><span class="label">Upload Date</span> ${item.upload_date || '—'}</div>
                <div><span class="label">Location</span> ${item.location || '—'}</div>
                <div><span class="label">People</span> ${item.people || '—'}</div>
                <div><span class="label">Event</span> ${item.event || '—'}</div>
                <div><span class="label">Tags</span> ${item.tags || '—'}</div>
                <div><span class="label">File Size</span> ${(item.file_size / 1024).toFixed(1)} KB</div>
            </div>
            <div class="detail-actions">
                <button class="btn btn-primary" onclick="window.open('${item.cloudinary_url}', '_blank')">⬇ Download</button>
                <button class="btn btn-outline" onclick="copyLink('${window.location.href}')">🔗 Copy Link</button>
                <button class="btn btn-outline" onclick="shareMedia('${item.id}')">📤 Share</button>
            </div>
            <div id="related-media">
                <h3>Related Media</h3>
                <div class="related-grid" id="related-grid"></div>
            </div>
        `;
        loadRelated(item.year_id, item.id);
    } catch (e) {
        document.getElementById('detail-container').innerHTML = '<p>Media not found.</p>';
    }
}

async function loadRelated(yearId, mediaId) {
    try {
        const data = await apiFetch(`/media/year/${yearId}/related?media_id=${mediaId}&limit=6`);
        const items = data.data || [];
        const grid = document.getElementById('related-grid');
        grid.innerHTML = items.map(item => `
            <div class="media-card" onclick="location.href='detail.html?id=${item.id}'">
                <div class="thumbnail">
                    ${item.media_type === 'video'
                        ? `<video src="${item.cloudinary_url}" muted></video>`
                        : `<img src="${item.cloudinary_url}" alt="${item.title}" loading="lazy">`
                    }
                </div>
                <div class="info">
                    <div class="title">${item.title || 'Untitled'}</div>
                </div>
            </div>
        `).join('');
    } catch (e) {}
}

function copyLink(url) {
    navigator.clipboard.writeText(url);
    alert('Link copied!');
}

async function shareMedia(id) {
    try {
        await apiFetch(`/media/${id}/share`, { method: 'POST' });
        const shareUrl = `${GITHUB_PAGES_URL}/detail.html?id=${id}`;
        const width = 600, height = 400;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=Check out this media!`,
            'share', `width=${width},height=${height},top=${top},left=${left}`
        );
    } catch (e) {}
}

// Initialize
if (document.getElementById('year-grid')) loadYears();
if (document.getElementById('gallery-grid')) loadGallery();
if (document.getElementById('detail-container')) loadDetail();
