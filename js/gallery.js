import { fetchMedia, apiFetch } from './api.js';

const GITHUB_PAGES_URL = 'https://rcsvit.github.io/RCSVITCloud';
const API_BASE = 'https://rcsvitcloud.onrender.com/api';

function thumbnailUrl(originalUrl, mediaType) {
    if (!originalUrl) return '';
    if (mediaType === 'video') {
        return originalUrl.replace('/upload/', '/upload/so_1,c_fill,w_400,h_267,q_auto,f_auto/')
                         .replace(/\.[^/.]+$/, '.jpg');
    }
    return originalUrl.replace('/upload/', '/upload/c_fill,w_400,h_267,q_auto,f_auto/');
}

function displayUrl(originalUrl, mediaType) {
    if (!originalUrl) return '';
    if (mediaType === 'video') return originalUrl;
    return originalUrl.replace('/upload/', '/upload/q_auto,f_auto,w_1200/');
}

function downloadUrl(originalUrl) { return originalUrl; }

function showDownloadPopup(imageUrl, title, callback) {
    const existing = document.getElementById('downloadPopup');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'downloadPopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;font-family:Arial,sans-serif;';
    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;padding:30px 25px;border-radius:12px;max-width:450px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.3);text-align:center;';
    box.innerHTML = `
        <h3 style="margin-bottom:15px;font-size:1.3rem;">💸 Hosting Costs</h3>
        <p style="margin-bottom:20px;color:#555;font-size:0.95rem;">
            Each download uses our limited bandwidth. You can help us by
            <strong>copying the link</strong> and sharing it instead.<br>
            The media will stay available online.
        </p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button id="popupCopyBtn" style="padding:10px 20px;border:2px solid #000;background:#fff;color:#000;font-weight:bold;border-radius:8px;cursor:pointer;">📋 Copy Link</button>
            <button id="popupDownloadBtn" style="padding:10px 20px;border:none;background:#d32f2f;color:#fff;font-weight:bold;border-radius:8px;cursor:pointer;">⬇️ Download Anyway</button>
        </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    const imgId = window.imageId || null;
    document.getElementById('popupCopyBtn').addEventListener('click', () => {
        const shareUrl = `${API_BASE}/share/${imgId}`;
        navigator.clipboard.writeText(shareUrl);
        const btn = document.getElementById('popupCopyBtn');
        btn.textContent = '✅ Copied!';
        apiFetch(`/media/${imgId}/share`, { method: 'POST' }).catch(() => {});
        setTimeout(() => { btn.textContent = '📋 Copy Link'; overlay.remove(); }, 1500);
    });
    document.getElementById('popupDownloadBtn').addEventListener('click', () => {
        overlay.remove();
        if (callback) callback();
    });
}

async function performDownload(imageUrl, title) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const ext = (imageUrl.split('.').pop() || 'jpg').split('?')[0];
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        const filename = `${safeTitle}.${ext}`;
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    } catch (err) {
        window.open(imageUrl, '_blank');
    }
}

// ── Page init ───────────────────────────────────────────
if (document.getElementById('year-grid')) loadYears();
if (document.getElementById('gallery-grid')) loadGallery();
if (document.getElementById('detail-container')) loadDetail();

// ── Years (with cover / auto‑cover) ─────────────────────
async function loadYears() {
    const container = document.getElementById('year-grid');
    if (!container) return;
    try {
        const data = await fetchMedia({ type: 'years' });
        const years = data.data || [];
        container.innerHTML = years.map(y => {
            const cover = y.cover_image || y.auto_cover;   // manual cover first, then first image
            return `
                <a href="gallery.html?year=${y.id}" class="gallery-card" style="display:block;text-decoration:none;color:inherit;">
                    <div class="card-img-wrap" style="background:#000; display:flex; align-items:center; justify-content:center; aspect-ratio:3/2;">
                        ${cover
                            ? `<img src="${cover}" style="width:100%;height:100%;object-fit:cover;">`
                            : `<span style="color:#fff; font-size:2rem; font-weight:700;">${y.year}</span>`
                        }
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${y.year}</h3>
                        <p class="card-sub">${y.president_name || 'President'} · ${y.media_count || 0} items</p>
                    </div>
                </a>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<p>Error loading years.</p>';
    }
}

// ── Gallery ─────────────────────────────────────────────
async function loadGallery() {
    const params = new URLSearchParams(window.location.search);
    const yearId = params.get('year');
    if (!yearId) { document.body.innerHTML = '<p>No year selected.</p>'; return; }
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    try {
        const data = await fetchMedia({ year_id: yearId, limit: 100 });
        const media = data.data || [];
        if (!media.length) { grid.innerHTML = '<p>No media for this year.</p>'; return; }
        grid.innerHTML = media.map(item => {
            const isVideo = item.media_type === 'video';
            return `
                <article class="gallery-card" onclick="location.href='detail.html?id=${item.id}'" style="cursor:pointer;">
                    <a class="card-link" style="pointer-events:none;">
                        <div class="card-img-wrap" style="position:relative;">
                            <img src="${thumbnailUrl(item.cloudinary_url, item.media_type)}" alt="${item.title}" loading="lazy" class="card-img">
                            ${isVideo ? '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:#fff;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;pointer-events:none;">▶</div>' : ''}
                        </div>
                        <div class="card-body">
                            <h3 class="card-title">${isVideo ? '🎬 ' : ''}${item.title || 'Untitled'}</h3>
                            <p class="card-sub">👁 ${item.views_count} · ⤴ ${item.shares_count}</p>
                        </div>
                    </a>
                </article>
            `;
        }).join('');
        apiFetch('/media/visitor', { method: 'POST' }).catch(() => {});
    } catch (e) { grid.innerHTML = '<p>Failed to load media.</p>'; }
}

// ── Detail ──────────────────────────────────────────────
async function loadDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    window.imageId = id;
    const container = document.getElementById('detail-container');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/media/${id}`);
        if (!res.ok) throw new Error('Not found');
        const json = await res.json();
        const item = json.data || json;
        document.title = `${item.title} — RCSVIT`;
        apiFetch(`/media/${id}/view`, { method: 'POST' }).catch(() => {});
        const isVideo = item.media_type === 'video';
        const mediaHtml = isVideo
            ? `<video class="detail-img" src="${item.cloudinary_url}" controls autoplay style="width:100%;max-height:560px;background:#000;"></video>`
            : `<img class="detail-img" src="${displayUrl(item.cloudinary_url, item.media_type)}" alt="${item.title}">`;
        const metaRows = [
            ['Title', item.title || '—'],
            ['Description', item.description || '—'],
            ['Capture Date', item.capture_date || '—'],
            ['Location', item.location || '—'],
            ['People', item.people || '—'],
            ['Uploaded By', item.uploaded_by || '—'],
            ['File Size', item.file_size ? (item.file_size/1024).toFixed(1) + ' KB' : '—']
        ].map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join('');
        container.innerHTML = `
            <div class="detail-img-wrap">${mediaHtml}</div>
            <h1 class="detail-title">${item.title || 'Untitled'}</h1>
            <p class="detail-desc">${item.description || ''}</p>
            <table class="meta-table"><tbody>${metaRows}</tbody></table>
            <div class="action-btns">
                <button id="downloadBtn" class="btn btn-dark">Download Image</button>
                <button id="copyLinkBtn" class="btn btn-dark">Copy Link</button>
            </div>
            <nav class="prev-next-nav">
                <button id="prevBtn" class="btn btn-outline">← Previous</button>
                <button id="nextBtn" class="btn btn-outline">Next →</button>
            </nav>
            <section class="related-section">
                <h2 class="related-heading">Related Media</h2>
                <div id="relatedGrid" class="gallery-grid related-grid"></div>
            </section>
        `;
        document.getElementById('downloadBtn').addEventListener('click', () => {
            showDownloadPopup(downloadUrl(item.cloudinary_url), item.title || 'Media', () => {
                performDownload(downloadUrl(item.cloudinary_url), item.title || 'Media');
            });
        });
        document.getElementById('copyLinkBtn').addEventListener('click', () => {
            const shareUrl = `${API_BASE}/share/${id}`;
            navigator.clipboard.writeText(shareUrl);
            const btn = document.getElementById('copyLinkBtn');
            btn.textContent = '✅ Copied!';
            apiFetch(`/media/${id}/share`, { method: 'POST' }).catch(() => {});
            setTimeout(() => { btn.textContent = 'Copy Link'; }, 2000);
        });
        const yearId = item.year_id;
        if (yearId) {
            const allData = await fetchMedia({ year_id: yearId, limit: 100 });
            const ids = (allData.data || []).map(i => i.id);
            const currentIndex = ids.indexOf(parseInt(id));
            document.getElementById('prevBtn').addEventListener('click', () => {
                const newIndex = currentIndex > 0 ? currentIndex - 1 : ids.length - 1;
                window.location.href = `detail.html?id=${ids[newIndex]}`;
            });
            document.getElementById('nextBtn').addEventListener('click', () => {
                const newIndex = currentIndex < ids.length - 1 ? currentIndex + 1 : 0;
                window.location.href = `detail.html?id=${ids[newIndex]}`;
            });
        }
        const relatedData = await fetchMedia({ year_id: yearId, limit: 4 });
        const relatedItems = (relatedData.data || []).filter(r => r.id !== parseInt(id)).slice(0, 4);
        document.getElementById('relatedGrid').innerHTML = relatedItems.map(r => {
            const isVid = r.media_type === 'video';
            return `
                <article class="gallery-card" onclick="location.href='detail.html?id=${r.id}'" style="cursor:pointer;">
                    <a class="card-link" style="pointer-events:none;">
                        <div class="card-img-wrap" style="position:relative;">
                            <img src="${thumbnailUrl(r.cloudinary_url, r.media_type)}" alt="${r.title}" loading="lazy" class="card-img">
                            ${isVid ? '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:#fff;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;pointer-events:none;">▶</div>' : ''}
                        </div>
                        <div class="card-body">
                            <h3 class="card-title">${isVid ? '🎬 ' : ''}${r.title || 'Untitled'}</h3>
                            <p class="card-sub">👁 ${r.views_count || 0} · ⤴ ${r.shares_count || 0}</p>
                        </div>
                    </a>
                </article>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<p>⚠️ Media not found or failed to load.</p>';
    }
}
