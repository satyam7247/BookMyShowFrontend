// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ===== SESSION (localStorage) =====
function setLoggedInUser(user) {
    localStorage.setItem('bms_user', JSON.stringify(user));
    updateNavUser();
}

function getLoggedInUser() {
    const u = localStorage.getItem('bms_user');
    return u ? JSON.parse(u) : null;
}

function logout() {
    localStorage.removeItem('bms_user');
    updateNavUser();
    showToast('Logged out successfully', 'success');
    const homePath = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
    if (!window.location.pathname.endsWith('/index.html') && !window.location.pathname.endsWith('/index.htm')) {
        window.location.href = homePath;
    }
}

function userIsAdmin() {
    const user = getLoggedInUser();
    return user && typeof user.role === 'string' && user.role.toLowerCase() === 'admin';
}

function updateNavUser() {
    const navUser = document.getElementById('nav-user');
    if (!navUser) return;
    const user = getLoggedInUser();
    const navLinks = document.querySelector('.nav-links');
    
    // Clear existing mobile user section if any
    navLinks?.querySelector('.mobile-user-section')?.remove();
    ensureCoreNavLinks(navLinks);
    
    const adminLink = userIsAdmin() ? `<a href="${getPagePath('pages/admin.html')}" class="btn btn-sm btn-primary">Admin Panel</a>` : '';
    const dashboardLink = user && !userIsAdmin() ? `<a href="${getPagePath('pages/dashboard.html')}#profile" class="btn btn-sm btn-outline" onclick="if(document.getElementById('profile-modal-overlay')){openProfileModal();return false;}">My Profile</a>` : '';
    
    if (user) {
        // Chhoti circular profile photo (localStorage me saved) — na ho to initial letter
        let avatarHtml;
        try {
            const photo = localStorage.getItem(`bms_profile_photo_${user.id}`);
            avatarHtml = photo
                ? `<img src="${photo}" alt="Me" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:2px solid var(--primary);" />`
                : `<span style="width:38px; height:38px; border-radius:50%; background:var(--primary); color:#fff; display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:0.95rem; border:2px solid var(--primary);">${(user.name || 'U').charAt(0).toUpperCase()}</span>`;
        } catch (e) { avatarHtml = ''; }
        const userHtml = `
            <a href="${getPagePath('pages/dashboard.html')}#profile" title="My Profile" onclick="if(document.getElementById('profile-modal-overlay')){openProfileModal();return false;}" style="display:inline-flex; align-items:center;">${avatarHtml}</a>
            ${adminLink}
            ${dashboardLink}
            <button class="btn btn-sm btn-outline nav-logout" onclick="logout()">Logout</button>
        `;
        navUser.innerHTML = userHtml;
        
        // Add to mobile menu
        if (navLinks) {
            const mobileSection = document.createElement('div');
            mobileSection.className = 'mobile-user-section';
            mobileSection.innerHTML = `
                ${userIsAdmin() ? `<a href="${getPagePath('pages/admin.html')}" class="btn btn-primary btn-block">Admin Panel</a>` : ''}
                <button class="btn btn-outline btn-block" style="color: var(--primary); border-color: var(--primary);" onclick="logout()">Logout</button>
            `;
            navLinks.appendChild(mobileSection);
        }
    } else {
        const loginButtons = `
            <a href="${getPagePath('pages/login.html')}" class="btn btn-sm btn-outline">Login</a>
            <a href="${getPagePath('pages/register.html')}" class="btn btn-sm btn-primary">Sign Up</a>
        `;
        navUser.innerHTML = loginButtons;
        
        // Add to mobile menu
        if (navLinks) {
            const mobileSection = document.createElement('div');
            mobileSection.className = 'mobile-user-section';
            mobileSection.innerHTML = `
                <a href="${getPagePath('pages/login.html')}" class="btn btn-outline btn-block">Login</a>
                <a href="${getPagePath('pages/register.html')}" class="btn btn-primary btn-block">Sign Up</a>
            `;
            navLinks.appendChild(mobileSection);
        }
    }
}

function ensureCoreNavLinks(navLinks) {
    if (!navLinks) return;
    const hasMovies = Array.from(navLinks.querySelectorAll('a'))
        .some(a => (a.getAttribute('href') || '').includes('movies.html'));
    if (!hasMovies) {
        const moviesLink = document.createElement('a');
        moviesLink.href = getPagePath('pages/movies.html');
        moviesLink.textContent = 'Movies';
        navLinks.appendChild(moviesLink);
    }
}

function updateNavLinksForRole() {
    const user = getLoggedInUser();
    document.querySelectorAll('.nav-links a').forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href.includes('bookings.html')) {
            a.style.display = userIsAdmin() ? 'none' : '';
        }
    });
}

// ===== MOVIE POSTER RESOLUTION (INSTANT & ULTRA FAST) =====
function getMoviePoster(movie) {
    if (!movie || typeof movie !== 'object') return '';

    const preferredKeys = [
        'posterUrl', 'posterURL', 'poster', 'posterImage',
        'posterPath', 'imageUrl', 'imageURL', 'image',
        'moviePoster', 'thumbnail', 'cover', 'coverImage', 'banner'
    ];

    for (const key of preferredKeys) {
        const value = movie[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }

    for (const [key, value] of Object.entries(movie)) {
        if (typeof value === 'string' && /poster|image|cover|thumbnail|banner/i.test(key) && value.trim()) {
            return value.trim();
        }
    }

    return '';
}

// Any HTTP/HTTPS link or data URI is directly usable as image src!
function isDirectImageSource(value) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('data:image/') ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('./') ||
        trimmed.startsWith('../')
    );
}

function normalizeSourceUrl(value) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ');
}

async function readFileAsDataUrl(file) {
    if (!file) return '';
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });
}

async function resolvePosterSource(input) {
    const source = normalizeSourceUrl(input);
    if (!source) return '';
    // Return direct web image link instantly without blocking HTTP requests!
    return source;
}

async function resolveMoviePosterSource(movieOrSource) {
    if (!movieOrSource) return '';
    if (typeof movieOrSource === 'string') {
        return resolvePosterSource(movieOrSource);
    }
    return resolvePosterSource(getMoviePoster(movieOrSource));
}

// Synchronous fast poster fetcher
async function getBestMoviePoster(movie) {
    const raw = getMoviePoster(movie);
    if (!raw) return '';
    return raw;
}

function moviePosterFallback(movie) {
    return getMoviePoster(movie) || '';
}

function getRowLabel(index) {
    let label = '';
    let n = index;
    while (n > 0) {
        n -= 1;
        label = String.fromCharCode(65 + (n % 26)) + label;
        n = Math.floor(n / 26);
    }
    return label || 'A';
}

// High-speed parallel seat generator for screens with missing seats
async function ensureSeatsForScreen(screenId, totalSeats, seatType = 'REGULAR', seatsPerRow = 10) {
    if (!screenId || !totalSeats || typeof SeatAPI === 'undefined') return [];

    try {
        const existingSeats = await SeatAPI.getByScreen(screenId);
        if (Array.isArray(existingSeats) && existingSeats.length > 0) {
            return existingSeats;
        }
    } catch {
        // If lookup fails, attempt creation.
    }

    const seatsToCreate = [];
    for (let i = 1; i <= Math.min(totalSeats, 60); i++) {
        const rowIndex = Math.floor((i - 1) / seatsPerRow) + 1;
        const col = ((i - 1) % seatsPerRow) + 1;
        const row = getRowLabel(rowIndex);
        seatsToCreate.push({
            seatNumber: `${row}${col}`,
            row,
            col,
            seatType,
            screenId
        });
    }

    // Execute in parallel batches of 5 for ultra fast creation
    const createdSeats = [];
    const batchSize = 5;
    for (let i = 0; i < seatsToCreate.length; i += batchSize) {
        const batch = seatsToCreate.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map(s => SeatAPI.add(s)));
        results.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
                createdSeats.push(res.value);
            }
        });
    }

    return createdSeats;
}

// Helper to resolve paths whether in root or pages/
function getPagePath(path) {
    if (window.location.pathname.includes('/pages/')) {
        return path.replace('pages/', '').replace('../', '');
    }
    return path;
}

function getBasePath() {
    return window.location.pathname.includes('/pages/') ? '../' : './';
}

// ===== LOADING SPINNER & SKELETON =====
function showLoading(containerId) {
    const el = document.getElementById(containerId);
    if (el) {
        el.innerHTML = `
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
        `;
    }
}

function showEmpty(containerId, message = 'No data found') {
    const el = document.getElementById(containerId);
    if (el) {
        el.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1.5px dashed var(--border-card); animation: fadeIn 0.4s ease;">
                <div style="font-size: 3.8rem; margin-bottom: 1rem; filter: drop-shadow(0 0 20px var(--primary-glow));"><i class="fa-solid fa-clapperboard" style="color:var(--primary);"></i></div>
                <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.5rem; color: var(--text-main); margin-bottom: 0.5rem;">${message}</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 460px; margin: 0 auto 1.5rem;">No records found. You can add new entries from the Admin Panel.</p>
            </div>
        `;
    }
}

// ===== MODAL HELPERS =====
function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ===== MOBILE NAV =====
function toggleNav(event) {
    event?.preventDefault();
    event?.stopPropagation();
    const navLinks = document.querySelector('.nav-links');
    const navToggle = document.getElementById('nav-toggle');
    if (!navLinks) return;

    const isOpen = navLinks.classList.toggle('open');
    navToggle?.classList.toggle('open', isOpen);
    navToggle?.setAttribute('aria-expanded', String(isOpen));
}

function closeNav() {
    document.querySelector('.nav-links')?.classList.remove('open');
    const navToggle = document.getElementById('nav-toggle');
    navToggle?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        document.querySelector('.nav-links')?.classList.remove('open');
    }
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-links a')) {
        closeNav();
        return;
    }
    if (!e.target.closest('.navbar')) {
        closeNav();
    }
});

// ===== SHARE FUNCTIONALITY =====
let currentSharingMovie = null;
let shareCountedInThisModal = false;

// Registry so movie data can be passed to openShareModal safely (no quoting issues in inline HTML)
const shareMovieRegistry = {};
function registerShareMovie(movie) {
    const key = `share-movie-${movie.id}`;
    shareMovieRegistry[key] = movie;
    return key;
}

// Build the real detail-page URL dynamically from the movie data and current origin
function buildMovieUrl(movie) {
    const inPages = window.location.pathname.includes('/pages/');
    return `${window.location.origin}${inPages ? '' : '/pages'}/movie-detail.html?id=${encodeURIComponent(movie.id)}`;
}

function getShareCountText(movieId) {
    return `${getShareCount(movieId)} shares`;
}

async function openShareModal(movieJsonOrKey) {
    try {
        let movie;
        if (typeof movieJsonOrKey === 'string' && shareMovieRegistry[movieJsonOrKey]) {
            movie = shareMovieRegistry[movieJsonOrKey];
        } else {
            movie = JSON.parse(decodeURIComponent(movieJsonOrKey));
        }
        currentSharingMovie = movie;
        shareCountedInThisModal = false; // one count per modal open, prevents duplicates from a single click

        const movieUrl = buildMovieUrl(movie);
        const safeTitle = String(movie.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const modalHtml = `
            <div style="text-align: center; padding: 0.5rem;">
                <h3 style="font-family:'Outfit', sans-serif; margin-bottom: 0.5rem; color:#fff;">Share Movie</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">Spread the word about "${safeTitle}"</p>

                <div class="share-options-grid">
                    <div class="share-option-item" onclick="shareToWhatsApp()">
                        <div class="share-icon-circle" style="background: #25D366;">
                            <i class="fa-brands fa-whatsapp"></i>
                        </div>
                        <span>WhatsApp</span>
                    </div>
                    <div class="share-option-item" onclick="copyMovieLink()">
                        <div class="share-icon-circle" style="background: var(--bg-elevated); border: 1px solid var(--border-card);">
                            <i class="fa-solid fa-link"></i>
                        </div>
                        <span>Copy Link</span>
                    </div>
                    ${navigator.share ? `
                    <div class="share-option-item" onclick="nativeShare()">
                        <div class="share-icon-circle" style="background: var(--primary);">
                            <i class="fa-solid fa-share-nodes"></i>
                        </div>
                        <span>More</span>
                    </div>` : ''}
                </div>
                
                <div style="margin-top: 2rem; padding: 1rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                    <input type="text" value="${movieUrl}" readonly style="width: 100%; background: transparent; border: none; color: var(--text-secondary); font-size: 0.8rem; text-align: center; outline: none;">
                </div>
            </div>
        `;

        let shareModal = document.getElementById('share-modal');
        if (!shareModal) {
            shareModal = document.createElement('div');
            shareModal.id = 'share-modal';
            shareModal.className = 'modal-overlay';
            shareModal.innerHTML = `
                <div class="modal" style="max-width: 400px;">
                    <button class="modal-close" onclick="closeModal('share-modal')">&times;</button>
                    <div id="share-modal-content"></div>
                </div>
            `;
            document.body.appendChild(shareModal);
        }

        document.getElementById('share-modal-content').innerHTML = modalHtml;
        openModal('share-modal');
    } catch (e) {
        console.error('Share error', e);
        showToast('Could not open share options', 'error');
    }
}

function countShareOnce() {
    if (shareCountedInThisModal || !currentSharingMovie) return;
    shareCountedInThisModal = true;
    incrementShareCount(currentSharingMovie.id);
    const tag = document.querySelector('#share-modal-content .share-count-tag');
    if (tag) tag.innerHTML = `<i class="fa-solid fa-share-nodes"></i> ${getShareCountText(currentSharingMovie.id)}`;
}

function shareToWhatsApp() {
    if (!currentSharingMovie) return;
    const movie = currentSharingMovie;
    const movieUrl = buildMovieUrl(movie);
    // wa.me works on mobile (opens WhatsApp app with contact/group chooser) and on desktop (WhatsApp Web)
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`🎬 Check out this movie: ${movie.title}\nBook your tickets here: ${movieUrl}`)}`;

    window.open(waUrl, '_blank');
    countShareOnce();
    closeModal('share-modal');
}

function copyMovieLink() {
    if (!currentSharingMovie) return;
    const movie = currentSharingMovie;
    const movieUrl = buildMovieUrl(movie);

    const done = () => {
        showToast('Link copied to clipboard!', 'success');
        countShareOnce();
        closeModal('share-modal');
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(movieUrl).then(done).catch(() => fallbackCopy(movieUrl, done));
    } else {
        fallbackCopy(movieUrl, done); // fallback for desktop / non-secure contexts
    }
}

function fallbackCopy(text, done) {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try {
        document.execCommand('copy');
        done();
    } catch {
        showToast('Could not copy link', 'error');
    }
    document.body.removeChild(input);
}

async function nativeShare() {
    if (!currentSharingMovie || !navigator.share) return;
    const movie = currentSharingMovie;
    const movieUrl = buildMovieUrl(movie);

    try {
        await navigator.share({
            title: movie.title,
            text: `🎬 Check out this movie: ${movie.title}`,
            url: movieUrl
        });
        countShareOnce();
        closeModal('share-modal');
    } catch (e) {
        console.log('Native share failed or cancelled');
    }
}

function incrementShareCount(movieId) {
    // Local persistence (used when backend share endpoint is unavailable)
    const shares = JSON.parse(localStorage.getItem('bms_movie_shares') || '{}');
    shares[movieId] = (shares[movieId] || 0) + 1;
    localStorage.setItem('bms_movie_shares', JSON.stringify(shares));

    // Best-effort backend persistence; silently ignored if the endpoint doesn't exist
    if (typeof MovieAPI !== 'undefined' && MovieAPI.incrementShare) {
        MovieAPI.incrementShare(movieId).catch(() => {});
    }

    // Refresh grids if visible
    if (typeof renderMovies === 'function' && typeof visibleMovies !== 'undefined') {
        renderMovies(visibleMovies);
    }
}

// ===== MOVIE LIKES =====
const LIKE_STORE_KEY = 'bms_movie_likes';
const LIKED_BY_USER_KEY = 'bms_movie_liked_by_user';

// Heart icon SVG (Material Symbols style) — used everywhere for likes
function heartIconSVG() {
    return '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M480-120 352-234q-72-65-123.5-116t-85-96q-33.5-45-49-87T79-621q0-94 63-156.5T299-840q52 0 99 22t82 62q35-40 82-62t99-22q94 0 157 62.5T881-621q0 46-15.5 88t-49 87q-33.5 45-85 96T608-234L480-120ZM171-560h618q6-16 9-31t3-30q0-60-41.5-99.5T661-760q-47 0-86.5 27.5T504-660h-48q-31-45-70.5-72.5T299-760q-57 0-98.5 39.5T159-621q0 15 3 30t9 31Zm102 140h414q16-17 29-31.5t24-28.5H220q11 14 24 28.5t29 31.5Zm207 192q36-32 67.5-59.5T605-340H355q26 25 57.5 52.5T480-228Zm0-332Z"/></svg>';
}

// Like count label: 0 -> empty, 1 -> "1 Like", n -> "n Likes"
function likeCountLabel(count) {
    if (!count || count <= 0) return '';
    return count === 1 ? '1 Like' : `${count} Likes`;
}

function getLikeStore() {
    try { return JSON.parse(localStorage.getItem(LIKE_STORE_KEY)) || {}; }
    catch { return {}; }
}

function getLikedByUser() {
    try { return JSON.parse(localStorage.getItem(LIKED_BY_USER_KEY)) || []; }
    catch { return []; }
}

// Base count: backend value if available on the movie object, else 0; local likes add on top
function getMovieLikeCount(movie) {
    const serverLikes = Number(movie?.likeCount ?? movie?.likes ?? movie?.like ?? 0) || 0;
    const localDelta = getLikeStore()[String(movie?.id)] || 0;
    return serverLikes + localDelta;
}

function isMovieLikedByUser(movieId) {
    return getLikedByUser().includes(String(movieId));
}

function toggleMovieLike(event, movieId) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const id = String(movieId);
    const liked = getLikedByUser();
    const store = getLikeStore();
    const alreadyLiked = liked.includes(id);

    if (alreadyLiked) {
        // Unlike: local delta only goes down to 0 (never below server count)
        const idx = liked.indexOf(id);
        liked.splice(idx, 1);
        store[id] = Math.max((store[id] || 0) - 1, 0);
        localStorage.setItem(LIKED_BY_USER_KEY, JSON.stringify(liked));
        localStorage.setItem(LIKE_STORE_KEY, JSON.stringify(store));
        // Best-effort backend unlike (silently fails if endpoint doesn't exist)
        if (typeof MovieAPI !== 'undefined' && MovieAPI.removeLike) MovieAPI.removeLike(id);
    } else {
        // Like: count once per user (duplicate clicks do nothing extra)
        liked.push(id);
        store[id] = (store[id] || 0) + 1;
        localStorage.setItem(LIKED_BY_USER_KEY, JSON.stringify(liked));
        localStorage.setItem(LIKE_STORE_KEY, JSON.stringify(store));
        // Best-effort backend persistence
        if (typeof MovieAPI !== 'undefined' && MovieAPI.incrementLike) {
            MovieAPI.incrementLike(id).catch(() => {});
        }
    }

    // Update button UI without re-rendering the whole grid
    const btn = document.querySelector(`.btn-like[data-movie-id="${id}"]`);
    if (btn) {
        const delta = getLikeStore()[id] || 0;
        let base = 0;
        if (window.__movieLikeBase) base = window.__movieLikeBase[id] || 0;
        btn.innerHTML = `${heartIconSVG()} <span class="like-count">${likeCountLabel(base + delta)}</span>`;
        btn.classList.toggle('liked', !alreadyLiked);
    }
}

function getShareCount(movieId) {
    const shares = JSON.parse(localStorage.getItem('bms_movie_shares') || '{}');
    return shares[movieId] || 0;
}

// ===== ON LOAD =====
document.addEventListener('DOMContentLoaded', () => {
    updateNavUser();
    updateNavLinksForRole();
    const navToggle = document.getElementById('nav-toggle');
    navToggle?.setAttribute('aria-expanded', 'false');
});
