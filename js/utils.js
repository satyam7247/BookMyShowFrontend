// ===== TOAST NOTIFICATIONS =====
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const safeType = ['success', 'error', 'info'].includes(type) ? type : 'info';
    toast.className = `toast toast-${safeType}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ===== SESSION (localStorage) =====
function setLoggedInUser(user) {
    const { accessToken, ...profile } = user || {};
    localStorage.setItem('bms_user', JSON.stringify(profile));
    if (accessToken) {
        localStorage.setItem('bms_access_token', accessToken);
    }
    updateNavUser();
}

function getLoggedInUser() {
    const u = localStorage.getItem('bms_user');
    if (!u) return null;
    try {
        return JSON.parse(u);
    } catch (error) {
        console.warn('Stored user profile is invalid; clearing the local session.', error);
        localStorage.removeItem('bms_user');
        localStorage.removeItem('bms_access_token');
        return null;
    }
}

function logout() {
    if (localStorage.getItem('bms_access_token') && typeof UserAPI !== 'undefined') {
        UserAPI.logout().catch(error => console.warn('Server-side logout failed.', error));
    }
    localStorage.removeItem('bms_user');
    localStorage.removeItem('bms_access_token');
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
    
    const safeName = escapeHtml(user?.name || 'User');
    const safeRole = escapeHtml(user?.role || '');
    const adminLink = userIsAdmin() ? `<a href="${getPagePath('pages/admin.html')}" class="btn btn-sm btn-primary">Admin Panel</a>` : '';
    const profileLink = user && !userIsAdmin() ? `<a href="${getPagePath('pages/dashboard.html')}#profile" class="btn btn-sm btn-outline">My Profile</a>` : '';
    
    if (user) {
        const roleLabel = user.role ? `<span class="role-tag">${safeRole}</span>` : '';
        const userHtml = `
            <div class="user-badge">
                <span>Hi, <strong>${safeName}</strong></span>
                ${roleLabel}
            </div>
            ${adminLink}
            ${profileLink}
            <button class="btn btn-sm btn-outline nav-logout" onclick="logout()">Logout</button>
        `;
        navUser.innerHTML = userHtml;
        
        // Add to mobile menu
        if (navLinks) {
            const mobileSection = document.createElement('div');
            mobileSection.className = 'mobile-user-section';
            mobileSection.innerHTML = `
                <div class="user-badge" style="margin-bottom: 1rem; justify-content: center;">
                    <span>Hi, <strong>${safeName}</strong></span>
                    ${roleLabel}
                </div>
                ${userIsAdmin() ? `<a href="${getPagePath('pages/admin.html')}" class="btn btn-primary btn-block">Admin Panel</a>` : ''}
                ${user && !userIsAdmin() ? `<a href="${getPagePath('pages/dashboard.html')}#profile" class="btn btn-outline btn-block">My Profile</a>` : ''}
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
    if (!/^image\/(?:png|jpe?g|gif|webp|avif)$/i.test(file.type || '') || file.size > 2 * 1024 * 1024) {
        throw new Error('Choose a PNG, JPEG, GIF, WebP, or AVIF image up to 2 MB.');
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });
}

function getSafeImageUrl(value) {
    if (typeof value !== 'string') return '';
    const source = value.trim();
    if (/^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(source)) {
        return source;
    }
    try {
        const url = new URL(source, window.location.href);
        const isSecureRemoteUrl = url.protocol === 'https:';
        const isSameOriginUrl = url.origin === window.location.origin
            && (url.protocol === 'http:' || url.protocol === 'https:');
        return isSecureRemoteUrl || isSameOriginUrl ? url.href : '';
    } catch {
        return '';
    }
}

async function resolvePosterSource(input) {
    const source = normalizeSourceUrl(input);
    if (!source) return '';
    return getSafeImageUrl(source);
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
    return getSafeImageUrl(getMoviePoster(movie));
}

function moviePosterFallback(movie) {
    return getSafeImageUrl(getMoviePoster(movie));
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

async function ensureSeatsForScreen(screenId, totalSeats, seatType = 'REGULAR', seatsPerRow = 10) {
    const numericScreenId = Number(screenId);
    const requestedSeatCount = Number(totalSeats);
    if (!Number.isSafeInteger(numericScreenId) || numericScreenId <= 0
        || !Number.isSafeInteger(requestedSeatCount) || requestedSeatCount <= 0) {
        throw new Error('A valid screen and positive seat count are required.');
    }
    if (typeof SeatAPI === 'undefined') {
        throw new Error('Seat API is unavailable.');
    }

    const existingSeats = await SeatAPI.getByScreen(numericScreenId);
    if (!Array.isArray(existingSeats)) {
        throw new Error('Could not verify existing seats for this screen.');
    }
    if (existingSeats.length > 0) return existingSeats;

    const seatsToCreate = [];
    for (let i = 1; i <= requestedSeatCount; i++) {
        const rowIndex = Math.floor((i - 1) / seatsPerRow) + 1;
        const col = ((i - 1) % seatsPerRow) + 1;
        const row = getRowLabel(rowIndex);
        seatsToCreate.push({
            seatNumber: `${row}${col}`,
            row,
            col,
            seatType,
            screenId: numericScreenId
        });
    }

    const createdSeats = [];
    const batchSize = 5;
    for (let i = 0; i < seatsToCreate.length; i += batchSize) {
        const batch = seatsToCreate.slice(i, i + batchSize);
        try {
            const createdBatch = await Promise.all(batch.map(seat => SeatAPI.add(seat)));
            if (createdBatch.some(seat => !seat || !Number.isSafeInteger(Number(seat.id)))) {
                throw new Error('The server returned an invalid seat record.');
            }
            createdSeats.push(...createdBatch);
        } catch (error) {
            throw new Error(`Seat creation was incomplete; some seats may already exist. Reload the screen and verify before retrying. ${error.message}`);
        }
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
                <h3 class="empty-state-message" style="font-family: 'Outfit', sans-serif; font-size: 1.5rem; color: var(--text-main); margin-bottom: 0.5rem;"></h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 460px; margin: 0 auto 1.5rem;">No records found. You can add new entries from the Admin Panel.</p>
            </div>
        `;
        el.querySelector('.empty-state-message').textContent = message;
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

async function openShareModal(movieJsonOrKey) {
    try {
        let movie;
        if (typeof movieJsonOrKey === 'string' && shareMovieRegistry[movieJsonOrKey]) {
            movie = shareMovieRegistry[movieJsonOrKey];
        } else {
            movie = JSON.parse(decodeURIComponent(movieJsonOrKey));
        }
        currentSharingMovie = movie;

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

function shareToWhatsApp() {
    if (!currentSharingMovie) return;
    const movie = currentSharingMovie;
    const movieUrl = buildMovieUrl(movie);
    // wa.me works on mobile (opens WhatsApp app with contact/group chooser) and on desktop (WhatsApp Web)
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`🎬 Check out this movie: ${movie.title}\nBook your tickets here: ${movieUrl}`)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    closeModal('share-modal');
}

function copyMovieLink() {
    if (!currentSharingMovie) return;
    const movie = currentSharingMovie;
    const movieUrl = buildMovieUrl(movie);

    const done = () => {
        showToast('Link copied to clipboard!', 'success');
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
        closeModal('share-modal');
    } catch (e) {
        console.log('Native share failed or cancelled');
    }
}

// ===== ON LOAD =====
function initializeCursorRing() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cursorRing = document.createElement('span');
    cursorRing.className = 'cursor-ring';
    cursorRing.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursorRing);

    document.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse') return;
        cursorRing.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
        cursorRing.classList.add('is-visible');
        const target = event.target instanceof Element ? event.target : null;
        cursorRing.classList.toggle(
            'is-hovering',
            Boolean(target?.closest('a, button, input, select, textarea, label, [role="button"], [tabindex]:not([tabindex="-1"])'))
        );
    });

    document.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse') cursorRing.classList.add('is-pressed');
    });
    document.addEventListener('pointerup', () => cursorRing.classList.remove('is-pressed'));
    document.addEventListener('pointercancel', () => cursorRing.classList.remove('is-pressed'));
    document.addEventListener('pointerout', event => {
        if (event.pointerType === 'mouse' && !event.relatedTarget) {
            cursorRing.classList.remove('is-visible', 'is-hovering', 'is-pressed');
        }
    });
    window.addEventListener('blur', () => cursorRing.classList.remove('is-visible', 'is-hovering', 'is-pressed'));
}

document.addEventListener('DOMContentLoaded', () => {
    initializeCursorRing();
    updateNavUser();
    updateNavLinksForRole();
    const navToggle = document.getElementById('nav-toggle');
    navToggle?.setAttribute('aria-expanded', 'false');
});
