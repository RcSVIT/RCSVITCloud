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

        // Fix back button to always point to the correct year gallery
        const backBtn = document.getElementById('backLink');
        if (backBtn && item.year_id) {
            backBtn.href = `gallery.html?year=${item.year_id}`;
        }

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
        // ... rest of event listeners unchanged ...
        document.getElementById('downloadBtn').addEventListener('click', () => { /* ... */ });
        document.getElementById('copyLinkBtn').addEventListener('click', () => { /* ... */ });
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
        document.getElementById('relatedGrid').innerHTML = relatedItems.map(r => { /* ... */ }).join('');
    } catch (e) {
        container.innerHTML = '<p>⚠️ Media not found or failed to load.</p>';
    }
}
