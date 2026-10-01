// Campus Companion - API Client Helper
// Handles auth headers, JSON parsing, error normalization, and all backend endpoints

const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('cc_auth_token') || null;
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('cc_auth_token', token);
    } else {
      localStorage.removeItem('cc_auth_token');
    }
  },

  getUser() {
    const raw = localStorage.getItem('cc_auth_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('cc_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cc_auth_user');
    }
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = options.headers || {};

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || `HTTP ${response.status}: Request failed`;
        // Handle token expiration
        if (response.status === 401 && this.getToken()) {
          this.setToken(null);
          this.setUser(null);
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        throw new Error(errorMsg);
      }

      return data.data;
    } catch (err) {
      console.warn(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // Auth endpoints
  auth: {
    signup(name, email, password) {
      return API.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
    },

    login(email, password) {
      return API.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    },

    me() {
      return API.request('/auth/me');
    }
  },

  // Places endpoints
  places: {
    getAll(type = '') {
      const query = type ? `?type=${encodeURIComponent(type)}` : '';
      return API.request(`/places${query}`);
    },

    updateStatus(placeId, status) {
      return API.request(`/places/${placeId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
    }
  },

  // Events endpoints
  events: {
    getAll() {
      return API.request('/events');
    },

    create(eventData) {
      return API.request('/events', {
        method: 'POST',
        body: JSON.stringify(eventData)
      });
    },

    delete(eventId) {
      return API.request(`/events/${eventId}`, {
        method: 'DELETE'
      });
    },

    register(eventId) {
      return API.request(`/events/${eventId}/register`, {
        method: 'POST'
      });
    }
  },

  // Issues endpoints
  issues: {
    getAll() {
      return API.request('/issues');
    },

    getMine() {
      return API.request('/issues/mine');
    },

    create(formData) {
      return API.request('/issues', {
        method: 'POST',
        body: formData // FormData automatically handles multipart
      });
    },

    upvote(issueId) {
      return API.request(`/issues/${issueId}/upvote`, {
        method: 'POST'
      });
    },

    updateStatus(issueId, status) {
      return API.request(`/issues/${issueId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    }
  },

  // Lost & Found endpoints
  lostfound: {
    getAll(filters = {}) {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.q) params.append('q', filters.q);
      const query = params.toString() ? `?${params.toString()}` : '';
      return API.request(`/lostfound${query}`);
    },

    create(formData) {
      return API.request('/lostfound', {
        method: 'POST',
        body: formData // FormData for file upload
      });
    },

    resolve(itemId) {
      return API.request(`/lostfound/${itemId}/resolve`, {
        method: 'PATCH'
      });
    }
  },

  // Canteen endpoints
  canteen: {
    getMenu() {
      return API.request('/canteen/menu');
    },

    updateMenu(itemId, updateData) {
      return API.request(`/canteen/menu/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
    },

    getCrowd() {
      return API.request('/canteen/crowd');
    },

    voteCrowd(level) {
      return API.request('/canteen/crowd', {
        method: 'POST',
        body: JSON.stringify({ level })
      });
    }
  },

  // Bus routes
  bus: {
    getAll() {
      return API.request('/bus');
    }
  },

  // Emergency contacts
  contacts: {
    getAll() {
      return API.request('/contacts');
    }
  },

  // Search
  search(query) {
    return API.request(`/search?q=${encodeURIComponent(query)}`);
  },

  // Today feed
  today: {
    get() {
      return API.request('/today');
    }
  },

  // College config
  config: {
    get() {
      return API.request('/config');
    }
  }
};

window.API = API;
