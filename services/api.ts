
import { MenuItem, LibraryItem, User, ExportConfig, SystemSettings, RestaurantProfile } from '../types';
import * as db from '../utils/db'; // Mock DB only used by mock functions

let dynamicMockMode = false;
const API_URL = 'http://0.0.0.0:8080/api'; 

// Wrapper for fetch to include credentials
const fetchWithCreds = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
        ...options,
        credentials: 'include',
    });
};

export const api = {
  shouldUseMock: () => dynamicMockMode,

  // --- AUTH METHODS ---
  login: async (email: string, password: string): Promise<User> => {
      const response = await fetchWithCreds(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error('Login failed');
      return await response.json();
  },
  register: async (email: string, password: string): Promise<User> => {
      const response = await fetchWithCreds(`${API_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Registration failed');
      }
      return await response.json();
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
      const response = await fetchWithCreds(`${API_URL}/profile/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to change password');
      }
  },
  updateProfile: async (email: string, profile?: RestaurantProfile): Promise<User> => {
      const response = await fetchWithCreds(`${API_URL}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, profile }),
      });
      if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update profile');
      }
      const data = await response.json();
      return data.user;
  },
  requestUpgrade: async (): Promise<User> => {
      const response = await fetchWithCreds(`${API_URL}/profile/upgrade-request`, {
          method: 'POST',
      });
      if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to request upgrade');
      }
      const data = await response.json();
      return data.user;
  },
  logout: async (): Promise<void> => {
      await fetchWithCreds(`${API_URL}/logout`, { method: 'POST' });
  },
  checkSession: async (): Promise<User | null> => {
      try {
        const response = await fetchWithCreds(`${API_URL}/session`);
        if (!response.ok) return null;
        const user = await response.json();
        return user || null;
      } catch (e) {
        console.warn("Server connection failed during session check.");
        dynamicMockMode = true;
        return null;
      }
  },

  // --- SETTINGS ---
  getSystemSettings: async (): Promise<SystemSettings> => {
      const res = await fetchWithCreds(`${API_URL}/settings`);
      if (!res.ok) throw new Error("Failed to load settings");
      return await res.json();
  },

  // --- MENU METHODS ---
  getMenu: async (): Promise<MenuItem[]> => {
    if (dynamicMockMode) return db.getAllItems();
    try {
      const response = await fetchWithCreds(`${API_URL}/menu`);
      if (!response.ok) throw new Error('Failed to fetch menu');
      return await response.json();
    } catch (error) {
      console.warn("Server connection failed, falling back to Mock Mode.", error);
      dynamicMockMode = true;
      return db.getAllItems();
    }
  },
  uploadFile: async (file: File, type: 'image' | 'model' | 'logo' | 'hero', itemId: string): Promise<string> => {
    if (dynamicMockMode) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
    }
    const formData = new FormData();
    formData.append('itemId', itemId); 
    formData.append('type', type);
    formData.append('file', file);

    const response = await fetchWithCreds(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'File upload failed');
    }
    const data = await response.json();
    return data.url; 
  },
  saveMenuItem: async (item: MenuItem): Promise<void> => {
    if (dynamicMockMode) return db.saveItem(item);
    const response = await fetchWithCreds(`${API_URL}/menu/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save item');
    }
  },
  deleteMenuItem: async (id: string): Promise<void> => {
    if (dynamicMockMode) return db.deleteItem(id);
    await fetchWithCreds(`${API_URL}/menu/${id}`, { method: 'DELETE' });
  },
  duplicateMenuItems: async (ids: string[]): Promise<{success: boolean, items: MenuItem[]}> => {
      const response = await fetchWithCreds(`${API_URL}/menu/duplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Duplicate failed");
      }
      return await response.json();
  },
  deleteBatchMenuItems: async (ids: string[]): Promise<void> => {
      const response = await fetchWithCreds(`${API_URL}/menu/delete-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
          throw new Error("Bulk delete failed");
      }
  },

  // --- LIBRARY METHODS ---
  getLibraryItems: async (): Promise<LibraryItem[]> => {
    if (dynamicMockMode) return [];
    const res = await fetchWithCreds(`${API_URL}/library`);
    if (!res.ok) throw new Error("Failed to fetch library");
    return await res.json();
  },
  saveLibraryItem: async (item: LibraryItem): Promise<void> => {
    if (dynamicMockMode) return;
    await fetchWithCreds(`${API_URL}/library`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  },

  // --- SUPER ADMIN METHODS ---
  getUsers: async (): Promise<User[]> => {
      const response = await fetchWithCreds(`${API_URL}/super/users`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return await response.json();
  },
  updateUserPlan: async (userId: number, plan: 'free' | 'paid'): Promise<void> => {
      const response = await fetchWithCreds(`${API_URL}/super/users/${userId}/plan`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan })
      });
      if (!response.ok) throw new Error("Failed to update plan");
  },
  rejectUpgradeRequest: async (userId: number): Promise<void> => {
      const response = await fetchWithCreds(`${API_URL}/super/users/${userId}/reject-upgrade`, {
          method: 'POST'
      });
      if (!response.ok) throw new Error("Failed to reject upgrade");
  },
  updateSystemSettings: async (settings: SystemSettings): Promise<void> => {
      const response = await fetchWithCreds(`${API_URL}/super/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
      });
      if(!response.ok) throw new Error("Failed to save settings");
  },

  // --- EXPORT ---
  exportWebsite: async (config?: ExportConfig): Promise<void> => {
    if (dynamicMockMode) {
      alert("Export is only available when connected to the backend server.");
      return;
    }
    let query = '';
    if (config) {
        const params = new URLSearchParams();
        Object.entries(config).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, String(value));
            }
        });
        query = `?${params.toString()}`;
    }
    const exportUrl = new URL(`${API_URL}/export${query}`);
    const response = await fetchWithCreds(exportUrl.toString());
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config?.title || 'website'}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};
