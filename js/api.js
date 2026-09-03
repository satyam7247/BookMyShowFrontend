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

// ===== GENERIC FETCH HELPERS =====
async function apiGet(endpoint) {
    const res = await fetch(`${API}${endpoint}`);
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
    const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
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
    const res = await fetch(`${API}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const rawBody = await res.text().catch(() => '');
        throw new Error(rawBody || res.statusText || 'Update failed');
    }
    return res.text().then(text => text ? JSON.parse(text) : null).catch(() => null);
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
    const res = await fetch(`${API}${endpoint}`, {
        method: 'DELETE'
    });
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
    update: (id, data) => apiPutFallback([`/movies/${id}`, `/movies/update/${id}`, `/movies/${id}/update`], data),
    delete: (id) => apiDelete(`/movies/${id}`),
    // Best-effort share count persistence; silently fails if the backend has no such endpoint
    incrementShare: (id) => apiPost(`/movies/${id}/share`, {}),
    // Like persistence - response me updated likeCount aata hai (pure backend, localStorage nahi)
    incrementLike: (id) => apiPost(`/movies/${id}/like`, {}),
    removeLike: async (id) => {
        const res = await fetch(`${API}/movies/${id}/like`, { method: 'DELETE' });
        const text = await res.text().catch(() => '');
        if (!res.ok) throw new Error(text || res.statusText || 'Unlike failed');
        return text ? JSON.parse(text) : null;
    }
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
    getById: (id) => apiGet(`/users/${id}`),
    update: (id, data) => apiPutFallback([`/users/${id}`, `/users/update/${id}`, `/users/${id}/update`], data)
};
