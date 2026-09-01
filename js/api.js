// ===== API BASE URL =====
const DEFAULT_API = 'https://my-springboot-backend-bookmyshow-1.onrender.com/api';

function resolveApiBase() {
    const configuredBase =
        typeof window !== 'undefined' && window.__BMS_API_BASE
            ? window.__BMS_API_BASE
            : null;
    let storedBase = null;
    try {
        storedBase = localStorage.getItem('bms_api_base');
    } catch {
        storedBase = null;
    }

    return (configuredBase || storedBase || DEFAULT_API).replace(/\/$/, '');
}

const API = resolveApiBase();

// Helper to alert user if Render backend is cold-starting
let warmupToastShown = false;
let warmupToastTimer = null;

function showWarmupToast() {
    if (warmupToastShown) return;
    warmupToastShown = true;
    if (typeof showToast === 'function') {
        showToast('⏳ Server is waking up... Render free tier cold start (~30s)', 'info');
    }
}

function notifyIfSlow(promise) {
    // Show warmup toast after 3 seconds of waiting (indicates cold start)
    if (warmupToastTimer) clearTimeout(warmupToastTimer);
    warmupToastTimer = setTimeout(showWarmupToast, 3000);
    
    return promise.finally(() => {
        if (warmupToastTimer) clearTimeout(warmupToastTimer);
    });
}

// ===== BACKEND WARMUP (prevent cold start on page load) =====
let _warmupPromise = null;

function warmupBackend() {
    if (_warmupPromise) return _warmupPromise;
    
    warmupToastShown = false;
    _warmupPromise = fetch(`${API}/actuator/health`, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    })
    .then(r => r.ok)
    .catch(() => {
        // Fallback: try root endpoint if actuator not available
        return fetch(`${API.replace('/api', '')}/`, { method: 'HEAD' })
            .then(r => r.ok)
            .catch(() => false);
    })
    .then(ok => {
        if (ok && typeof showToast === 'function') {
            showToast('✅ Server ready!', 'success');
        }
        return ok;
    });
    
    return _warmupPromise;
}

// Auto-warmup on page load
if (typeof window !== 'undefined') {
    // Small delay to not block initial render
    setTimeout(warmupBackend, 100);
    // Expose globally for pages to trigger warmup manually
    window.warmupBackend = warmupBackend;
}

// ===== GENERIC FETCH HELPERS =====
async function apiGet(endpoint) {
    const res = await notifyIfSlow(fetch(`${API}${endpoint}`));
    if (!res.ok) {
        let errText = await res.text().catch(() => res.statusText);
        try {
            const errJson = JSON.parse(errText);
            const msg = errJson.message || errJson.error || errJson.errorMessage || JSON.stringify(errJson);
            throw new Error(msg || res.statusText || 'Request failed');
        } catch {
            throw new Error(errText || res.statusText || 'Request failed');
        }
    }
    return res.json();
}

async function apiPost(endpoint, data) {
    const res = await notifyIfSlow(fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }));
    if (!res.ok) {
        const rawBody = await res.text().catch(() => '');
        try {
            const errBody = rawBody ? JSON.parse(rawBody) : {};
            console.error('API error', endpoint, res.status, errBody);
            let msg = errBody.message || errBody.Message || errBody['Message '] || errBody.error;
            if (!msg) {
                const vals = Object.values(errBody || {});
                msg = vals.find(v => typeof v === 'string');
            }
            if (!msg) msg = JSON.stringify(errBody) || res.statusText;
            throw new Error(msg);
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.error('API error (non-json)', endpoint, res.status, rawBody);
                throw new Error(rawBody || res.statusText || 'Request failed');
            }
            throw err;
        }
    }
    return res.json();
}

async function apiPostFallback(endpoints, data) {
    let lastError;
    for (const ep of endpoints) {
        try {
            return await apiPost(ep, data);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('All candidate endpoints failed');
}

async function apiPut(endpoint, data) {
    const res = await notifyIfSlow(fetch(`${API}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }));
    if (!res.ok) {
        const rawBody = await res.text().catch(() => '');
        throw new Error(rawBody || res.statusText || 'Update failed');
    }
    return res.text().then(text => text ? JSON.parse(text) : null).catch(() => null);
}

async function apiDelete(endpoint) {
    const res = await notifyIfSlow(fetch(`${API}${endpoint}`, {
        method: 'DELETE'
    }));
    if (!res.ok) {
        let errText = await res.text().catch(() => res.statusText);
        try {
            const errJson = JSON.parse(errText);
            throw new Error(errJson.message || errJson.error || res.statusText);
        } catch {
            throw new Error(errText || res.statusText || 'Delete failed');
        }
    }
    return res.text();
}

// ===== API DOMAIN SERVICES =====
const CityAPI = {
    getAll: () => apiGet('/cities'),
    add: (data) => apiPost('/cities', data)
};

const MovieAPI = {
    getAll: () => apiGet('/movies'),
    getById: (id) => apiGet(`/movies/${id}`),
    add: (data) => apiPostFallback(['/movies', '/movies/add'], data),
    update: (id, data) => apiPut(`/movies/${id}`, data),
    delete: (id) => apiDelete(`/movies/${id}`)
};

const TheaterAPI = {
    getAll: () => apiGet('/theaters'),
    getByCity: (cityId) => apiGet(`/theaters/city/${cityId}`),
    add: (data) => apiPost('/theaters', data)
};

const ScreenAPI = {
    getAll: () => apiGet('/screens'),
    getById: (id) => apiGet(`/screens/${id}`),
    getByTheater: (theaterId) => apiGet(`/screens/theater/${theaterId}`),
    add: (data) => apiPost('/screens', data)
};

const SeatAPI = {
    getByScreen: (screenId) => apiGet(`/seats/screen/${screenId}`),
    add: (data) => apiPost('/seats', data)
};

const ShowAPI = {
    getAll: () => apiGet('/shows'),
    getByMovie: (movieId) => apiGet(`/shows/movie/${movieId}`),
    add: (data) => apiPost('/shows', data),
    delete: (id) => apiDelete(`/shows/${id}`)
};

const BookingAPI = {
    create: (data) => apiPost('/bookings', data),
    getByUser: (userId) => apiGet(`/bookings/user/${userId}`),
    getAvailableSeats: (showId) => apiGet(`/bookings/show/${showId}/available-seats`),
    cancel: (id) => apiPost(`/bookings/${id}/cancel`, {})
};

const PaymentAPI = {
    createOrder: (data) => apiPost('/payment/create-order', data),
    verify: (data) => apiPost('/payment/verify', data)
};

const UserAPI = {
    getAll: () => apiGet('/users'),
    login: (data) => apiPost('/users/login', data),
    register: (data) => apiPost('/users/register', data),
    getById: (id) => apiGet(`/users/${id}`)
};
