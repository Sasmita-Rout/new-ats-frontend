import { PublicClientApplication, Configuration, AuthenticationResult, AccountInfo } from '@azure/msal-browser';
import { User, UserRole } from '../types/types';

// -----------------------
// MSAL CONFIGURATION
// -----------------------
const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || 'your-client-id',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'your-tenant-id'}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

// Backend API - prefer a relative path so Vite dev proxy can forward requests
// If an absolute URL is provided in VITE_API_BASE_URL during development, convert it
// to a relative path to ensure requests go through the dev server proxy and avoid CORS.
const rawApiBase = import.meta.env.VITE_API_BASE_URL || '/sso_backend';
let API_BASE_URL = rawApiBase;
try {
  if (import.meta.env.DEV && typeof rawApiBase === 'string' && /^https?:\/\//.test(rawApiBase)) {
    // convert full url like http://localhost:8000/sso_backend -> /sso_backend
    const url = new URL(rawApiBase);
    API_BASE_URL = url.pathname.replace(/\/$/, '') || '/sso_backend';
    console.log('[AuthService] Converted absolute API URL to relative path:', API_BASE_URL);
  }
} catch (e) {
  API_BASE_URL = rawApiBase;
}

console.log('[AuthService] Resolved API_BASE_URL:', API_BASE_URL);

export class AuthService {
  public msalInstance: PublicClientApplication;

  constructor() {
    this.msalInstance = msalInstance;
  }

  // -----------------------
  // MSAL LOGIN / LOGOUT
  // -----------------------
  async login(): Promise<AuthenticationResult | null> {
    try {
      const loginRequest = { scopes: ['User.Read'] };
      const response = await this.msalInstance.loginPopup(loginRequest);
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.msalInstance.logoutPopup();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  // -----------------------
  // ACCOUNT / TOKEN
  // -----------------------
  getCurrentAccount(): AccountInfo | null {
    const accounts = this.msalInstance.getAllAccounts();
    return accounts[0] || null;
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const account = this.getCurrentAccount();
      if (!account) return null;

      const tokenRequest = { scopes: ['User.Read'], account };
      const response = await this.msalInstance.acquireTokenSilent(tokenRequest);
      return response.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  // -----------------------
  // SESSION / USER DATA
  // -----------------------
  async setSession(accessToken: string): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/set-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to set session:', response.statusText);
        return null;
      }

      const data = await response.json();
      const account = this.getCurrentAccount();
      if (!account) return null;

      return {
        id: 0,
        email: account.username,
        name: account.name || '',
        avatar: account.name ? account.name.charAt(0).toUpperCase() : '',
        role: 'Recruiter' as UserRole,
        permissions: data.permissions || [],
        apps: [],
        is_super_admin: false,
        password: '',
      };
    } catch (error) {
      console.error('Error setting session:', error);
      return null;
    }
  }

  async getUserData(): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include', // 🔑 ensures cookies are sent
      });

      if (!response.ok) {
        console.error('Failed to get user data:', response.statusText);
        return null;
      }

      const data = await response.json();
      const account = this.getCurrentAccount();
      if (!account) return null;

      return {
        id: 0,
        email: account.username,
        name: account.name || '',
        avatar: account.name ? account.name.charAt(0).toUpperCase() : '',
        role: 'Recruiter' as UserRole,
        permissions: data.permissions || [],
        apps: [],
        is_super_admin: false,
        password: '',
      };
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // -----------------------
  // CHECK SESSION STATUS
  // -----------------------
  async checkSessionStatus(ssoToken?: string): Promise<{ authenticated: boolean; user?: User }> {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      let apiUrl = `${API_BASE_URL}/api/auth/session-status`;

      const isRelativeApi = typeof API_BASE_URL === 'string' && API_BASE_URL.startsWith('/');
      if (ssoToken) {
        if (isRelativeApi) {
          // When using a relative API path the dev server proxy will forward the
          // request to the backend from the same origin, so it's safe to send
          // the Authorization header (won't trigger CORS in the browser).
          headers['Authorization'] = `Bearer ${ssoToken}`;
          console.log('🔑 Using SSO token in Authorization header (proxy/same-origin)');
        } else {
          // Fallback: send token as query param so we avoid custom headers when
          // hitting a different origin (may still require backend CORS to accept).
          apiUrl += `?sso_token=${encodeURIComponent(ssoToken)}`;
          console.log('🔑 Using SSO token (query param) for session check');
        }
      } else {
        console.log('🍪 Using cookie-based authentication (sso_session cookie)');
      }

      console.log(`[AuthService] Calling ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers,
        credentials: 'include', // 🔑 sends sso_session cookie
      });

      if (!response.ok) {
        console.warn('⚠️ Session check API error:', response.status, await response.text());
        return { authenticated: false };
      }

      const data = await response.json();
      console.log('📦 Session status response:', data);

      if (data.authenticated) {
        if (data.email && data.name) {
          // Get MSAL account to use intranet name
          const account = this.getCurrentAccount();
          const intranetName = account?.name || data.name; // Use MSAL account name (from intranet) as primary

          return {
            authenticated: true,
            user: {
              id: 0,
              email: data.email,
              name: intranetName, // Use name from intranet (MSAL account)
              avatar: intranetName.charAt(0).toUpperCase(),
              role: data.is_super_admin ? 'Main Admin' : (data.role || 'Recruiter'),
              permissions: data.permissions || [],
              apps: data.apps || [],
              is_super_admin: data.is_super_admin || false,
              password: '',
            },
          };
        } else {
          console.warn('⚠️ Authenticated but no user data from intranet');
          return { authenticated: true };
        }
      }

      return { authenticated: false };
    } catch (error: any) {
      console.error('❌ Error checking session:', error);
      return { authenticated: false };
    }
  }

  // -----------------------
  // LOGOUT FROM BACKEND
  // -----------------------
  async logoutFromBackend(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error logging out from backend:', error);
    }
  }
}

// Export singleton
export const authService = new AuthService();
export default authService;
