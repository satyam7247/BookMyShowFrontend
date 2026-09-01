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
    
    const adminLink = userIsAdmin() ? `<a href="${getPagePath('pages/admin.html')}" class="btn btn-sm btn-primary">Admin Panel</a>` : '';
    const dashboardLink = user && !userIsAdmin() ? `<a href="${getPagePath('pages/dashboard.html')}" class="btn btn-sm btn-outline">Dashboard</a>` : '';
    
    if (user) {
        const roleLabel = user.role ? `<span class="role-tag">${user.role}</span>` : '';
        const userHtml = `
            <div class="user-badge">
                <span>Hi, <strong>${user.name || 'User'}</strong></span>
                ${roleLabel}
            </div>
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
                <div class="user-badge" style="margin-bottom: 1rem; justify-content: center;">
                    <span>Hi, <strong>${user.name || 'User'}</strong></span>
                    ${roleLabel}
                </div>
                ${userIsAdmin() ? `<a href="${getPagePath('pages/admin.html')}" class="btn btn-primary btn-block">Admin Panel</a>` : ''}
                ${user && !userIsAdmin() ? `<a href="${getPagePath('pages/dashboard.html')}" class="btn btn-outline btn-block">Dashboard</a>` : ''}
                <button class="btn btn-outline btn-block" style="color: var(--primary); border-color: var(--primary);" onclick="logout()">Logout</button>
            `;
            navLinks.prepend(mobileSection);
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
            navLinks.prepend(mobileSection);
        }
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
                <div style="font-size: 3.8rem; margin-bottom: 1rem; filter: drop-shadow(0 0 20px var(--primary-glow));">🎬</div>
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
function toggleNav() {
    document.querySelector('.nav-links')?.classList.toggle('open');
}

function closeNav() {
    document.querySelector('.nav-links')?.classList.remove('open');
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        document.querySelector('.nav-links')?.classList.remove('open');
    }
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-links a')) {
        closeNav();
    }
});

// ===== ON LOAD =====
document.addEventListener('DOMContentLoaded', () => {
    updateNavUser();
    updateNavLinksForRole();
});
