// ===== API BASE URL =====
const DEFAULT_API = 'https://my-springboot-backend-bookmyshow-1.onrender.com/api';
const API_TIMEOUT_MS = 60000;

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

async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const headers = new Headers(options.headers || {});
    let accessToken = null;
    try {
        accessToken = localStorage.getItem('bms_access_token');
    } catch {
        accessToken = null;
    }
    if (accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    try {
        return await fetch(url, { ...options, headers, signal: controller.signal });
    } catch (error) {
        if (error && error.name === 'AbortError') {
            throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. The backend may be offline or starting up.`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

function parseApiError(res, rawBody, fallbackText) {
    if (!res || typeof res.ok === 'boolean' && !res.ok) {
        const statusText = res && res.statusText ? res.statusText : 'Request failed';
        if (rawBody) {
            try {
                const errJson = JSON.parse(rawBody);
                const msg = errJson.message || errJson.error || errJson.errorMessage || errJson.Message || JSON.stringify(errJson);
                if (msg) return new Error(msg);
            } catch {
                // Fall through to raw text below.
            }
            if (rawBody.trim()) return new Error(rawBody.trim());
        }
        return new Error(fallbackText || statusText || 'Request failed');
    }
    return null;
}

// ===== GENERIC FETCH HELPERS =====
async function apiGet(endpoint) {
    const url = `${API}${endpoint}`;
    const res = await fetchWithTimeout(url);
    const rawBody = await res.text().catch(() => '');
    const parsedError = parseApiError(res, rawBody, 'Request failed');
    if (parsedError) throw parsedError;
    if (!rawBody) return null;
    try {
        return JSON.parse(rawBody);
    } catch {
        return rawBody;
    }
}

async function apiPost(endpoint, data) {
    const url = `${API}${endpoint}`;
    const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const rawBody = await res.text().catch(() => '');
    const parsedError = parseApiError(res, rawBody, 'Request failed');
    if (parsedError) throw parsedError;
    if (!rawBody) return null;
    try {
        return JSON.parse(rawBody);
    } catch {
        return rawBody;
    }
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
    const url = `${API}${endpoint}`;
    const res = await fetchWithTimeout(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const rawBody = await res.text().catch(() => '');
    const parsedError = parseApiError(res, rawBody, 'Update failed');
    if (parsedError) throw parsedError;
    if (!rawBody) return null;
    try {
        return JSON.parse(rawBody);
    } catch {
        return rawBody;
    }
}

async function apiPutFallback(endpoints, data) {
    let lastError;
    for (const ep of endpoints) {
        try {
            return await apiPut(ep, data);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('All candidate endpoints failed');
}

async function apiDelete(endpoint) {
    const url = `${API}${endpoint}`;
    const res = await fetchWithTimeout(url, { method: 'DELETE' });
    const rawBody = await res.text().catch(() => '');
    const parsedError = parseApiError(res, rawBody, 'Delete failed');
    if (parsedError) throw parsedError;
    return rawBody;
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
    update: (id, data) => apiPutFallback([`/movies/${id}`, `/movies/update/${id}`, `/movies/${id}/update`], data),
    delete: (id) => apiDelete(`/movies/${id}`),
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
    getAll: () => apiGet('/bookings'),
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
    getById: (id) => apiGet(`/users/${id}`),
    update: (id, data) => apiPut(`/users/${id}`, data),
    logout: () => apiPost('/users/logout', {})
};
