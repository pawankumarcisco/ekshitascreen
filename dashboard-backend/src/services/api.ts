import {
  Screen,
  ScreenConfiguration,
  MediaAsset,
  Playlist,
  AuditLog,
  HealthCheckResponse
} from '../types';

let authToken: string | null = localStorage.getItem('screencast_token');

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('screencast_token', token);
}

export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('screencast_token');
}

export function getAuthToken(): string | null {
  return authToken;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (authToken && authToken !== 'demo-token') {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

async function readJson(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(res.ok
      ? 'The server is running an older version. Restart the EkshitaScreen server and try again.'
      : `Server request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  async getHealth(): Promise<HealthCheckResponse> {
    const res = await fetch('/api/health');
    return res.json();
  },

  async login(email: string, password: string): Promise<any> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    if (data.token) setAuthToken(data.token);
    return data;
  },

  async getCurrentUser(): Promise<any> {
    const res = await fetch('/api/auth/me', { headers: authHeaders() });
    if (!res.ok) throw new Error('Session expired');
    return res.json();
  },

  async getScreens(): Promise<Screen[]> {
    const res = await fetch('/api/screens', { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch screens');
    return res.json();
  },

  async getScreen(id: string): Promise<Screen> {
    const res = await fetch(`/api/screens/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch screen');
    return res.json();
  },

  async updateScreen(id: string, updates: Partial<Screen>): Promise<Screen> {
    const res = await fetch(`/api/screens/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update screen');
    return res.json();
  },

  async unregisterScreen(id: string): Promise<void> {
    const res = await fetch(`/api/screens/${id}/unregister`, { method: 'DELETE', headers: authHeaders() });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to unregister screen');
  },

  async renewScreen(id: string): Promise<Screen> {
    const res = await fetch(`/api/screens/${id}/renew`, { method: 'POST', headers: authHeaders() });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to renew screen');
    return data;
  },

  async updateScreenConfig(id: string, config: Partial<ScreenConfiguration>): Promise<ScreenConfiguration> {
    const res = await fetch(`/api/screens/${id}/config`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error('Failed to update configuration');
    return res.json();
  },

  async registerScreen(payload: {
    code: string;
    name: string;
    location?: string;
    description?: string;
    userId: string;
    config?: Partial<ScreenConfiguration>;
  }): Promise<any> {
    const res = await fetch('/api/screens/register', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register screen');
    }
    return res.json();
  },

  async getMedia(): Promise<MediaAsset[]> {
    const res = await fetch('/api/media', { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch media assets');
    return res.json();
  },

  async uploadMedia(files: File[], options?: { dpi: 75 | 100 | 150 | 200; quality: number }): Promise<MediaAsset[]> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (options) {
      formData.append('dpi', String(options.dpi));
      formData.append('quality', String(options.quality));
    }

    const res = await fetch('/api/media/upload', {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  async deleteMedia(id: string): Promise<void> {
    const res = await fetch(`/api/media/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete asset');
    }
  },

  async getScreenPlaylist(screenId: string): Promise<{ published: Playlist | null; draft: Playlist | null }> {
    const res = await fetch(`/api/screens/${screenId}/playlist`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch playlist');
    return res.json();
  },

  async saveDraftPlaylist(screenId: string, items: Array<{ mediaAssetId: string; sortOrder: number; durationSeconds: number; enabled: boolean }>): Promise<any> {
    const res = await fetch(`/api/screens/${screenId}/playlist/draft`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ items })
    });
    if (!res.ok) throw new Error('Failed to save draft playlist');
    return res.json();
  },

  async publishPlaylist(screenId: string): Promise<any> {
    const res = await fetch(`/api/screens/${screenId}/playlist/publish`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to publish playlist');
    }
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/audit', {
      headers: authHeaders()
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getUsers(): Promise<any[]> {
    const res = await fetch('/api/users', { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    return readJson(res);
  },

  async createUser(payload: any): Promise<any> {
    const res = await fetch('/api/users', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
    const data = await readJson(res); if (!res.ok) throw new Error(data.error || 'Failed to create user'); return data;
  },

  async updateUser(id: string, payload: any): Promise<any> {
    const res = await fetch(`/api/users/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload) });
    const data = await readJson(res); if (!res.ok) throw new Error(data.error || 'Failed to update user'); return data;
  },

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await readJson(res); if (!res.ok) throw new Error(data.error || 'Failed to delete user');
  }
};
