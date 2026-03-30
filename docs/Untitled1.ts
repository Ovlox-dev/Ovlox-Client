// tokenService.ts 
import { config } from './config';

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface DecodedToken {
  userId: string;
  type: string;
  iat: number;
  exp: number;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

interface RefreshErrorResponse {
  message: string;
  code?: string;
}

class TokenService {
  private static instance: TokenService;
  private refreshPromise: Promise<TokenData> | null = null;

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  // Store tokens securely
  setTokens(accessToken: string, refreshToken?: string): void {
    try {
      const decoded = this.decodeToken(accessToken);
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds

      const tokenData: TokenData = {
        accessToken,
        refreshToken,
        expiresAt,
      };

      // Store in localStorage (you could also use sessionStorage for session-only tokens)
      localStorage.setItem('auth_tokens', JSON.stringify(tokenData));

      // Also store access token separately for easy access
      localStorage.setItem('access_token', accessToken);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to store tokens:', error);
      this.clearTokens();
    }
  }

  // Get stored tokens
  getTokens(): TokenData | null {
    try {
      const stored = localStorage.getItem('auth_tokens');
      if (!stored) {
        return null;
      }

      const tokenData = JSON.parse(stored) as TokenData;

      // Check if access token is expired
      if (Date.now() >= tokenData.expiresAt) {
        this.clearTokens();
        return null;
      }

      return tokenData;
    } catch {
      // eslint-disable-next-line no-console
      console.error('Failed to get tokens');
      this.clearTokens();
      return null;
    }
  }

  // Get access token
  getAccessToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.accessToken ?? null;
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    const tokens = this.getTokens();
    if (!tokens) {
      return true;
    }

    // Add 1 minute buffer to prevent edge cases (tokens expire in 15 minutes)
    return Date.now() >= tokens.expiresAt - 60 * 1000;
  }

  // Check if token will expire soon (within 5 minutes)
  isTokenExpiringSoon(): boolean {
    const tokens = this.getTokens();
    if (!tokens) {
      return true;
    }

    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() >= tokens.expiresAt - fiveMinutes;
  }

  // Decode JWT token
  decodeToken(token: string): DecodedToken {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload) as DecodedToken;
    } catch {
      throw new Error('Invalid token format');
    }
  }

  // Validate token structure and expiration
  validateToken(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);

      return decoded.exp > now && decoded.type === 'access';
    } catch {
      return false;
    }
  }

  // Refresh token with automatic retry and deduplication
  async refreshToken(): Promise<TokenData> {
    // If already refreshing, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<TokenData> {
    try {
      // Refresh token is stored in HttpOnly cookie by backend
      // We don't need to check for it in localStorage or send it in body
      // The cookie will be automatically sent with credentials: 'include'
      const response = await fetch(`${config.apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This sends the HttpOnly cookie with refresh token
        // No body needed - refresh token comes from cookie
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as RefreshErrorResponse;

        // Handle specific error cases
        if (errorData.code === 'TOKEN_REUSE_DETECTED') {
          this.clearTokens();
          throw new Error('Security compromised - please login again');
        }

        throw new Error(errorData.message ?? 'Token refresh failed');
      }

      const data = (await response.json()) as RefreshResponse;

      // Store new tokens
      this.setTokens(data.accessToken, data.refreshToken);

      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: this.decodeToken(data.accessToken).exp * 1000,
      };
    } catch (error) {
      // Only clear tokens if it's a security error, not network errors
      if (error instanceof Error && error.message.includes('Security compromised')) {
        this.clearTokens();
      } else if (error instanceof Error && !error.message.includes('Network')) {
        // Clear tokens on refresh failure (but not on network errors to allow retry)
        this.clearTokens();
      }
      throw error instanceof Error ? error : new Error('Token refresh failed');
    }
  }

  // Clear all stored tokens
  clearTokens(): void {
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('access_token');
  }

  // Get user ID from token
  getUserId(): string | null {
    try {
      const token = this.getAccessToken();
      if (!token) {
        return null;
      }

      const decoded = this.decodeToken(token);
      return decoded.userId;
    } catch {
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const tokens = this.getTokens();
    if (!tokens) {
      return false;
    }

    return this.validateToken(tokens.accessToken) && !this.isTokenExpired();
  }
}

export const tokenService = TokenService.getInstance();
export default TokenService;




// httpClient.ts
import { config } from './config';
import TokenService from './tokenService';

/**
 * Extended request configuration options
 */
export interface RequestConfig extends RequestInit {
  /** Skip adding authentication headers to the request */
  skipAuth?: boolean;
  /** Number of retry attempts (used internally for token refresh) */
  retryCount?: number;
}

/**
 * HTTP Client Singleton
 *
 * A centralized HTTP client that handles:
 * - Automatic authentication token management
 * - Token refresh on 401 errors
 * - Request/response interceptors
 * - Standardized error handling
 *
 * Uses the singleton pattern to ensure a single instance across the application.
 */
class HttpClient {
  private static instance: HttpClient;
  private baseURL: string;
  private tokenService: TokenService;

  private constructor() {
    this.baseURL = config.apiUrl;
    this.tokenService = TokenService.getInstance();
  }

  /**
   * Gets the singleton instance of HttpClient
   *
   * Creates a new instance if one doesn't exist, otherwise returns
   * the existing instance.
   *
   * @returns The singleton HttpClient instance
   */
  static getInstance(): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient();
    }
    return HttpClient.instance;
  }

  /**
   * Generic request method with automatic token handling
   *
   * Handles authentication, token refresh, error handling, and response parsing.
   * Automatically retries requests once if a 401 error occurs and token refresh succeeds.
   *
   * @template T - The expected response type
   * @param endpoint - The API endpoint (relative to base URL)
   * @param options - Request configuration options
   * @param options.skipAuth - Skip adding authentication headers
   * @param options.retryCount - Internal retry counter (used for token refresh)
   * @returns Promise resolving to the response data
   * @throws Error if the request fails or authentication fails
   */
  async request<T = unknown>(endpoint: string, options: RequestConfig = {}): Promise<T> {
    const { skipAuth = false, retryCount = 0, ...requestOptions } = options;

    try {
      // Add authentication header if not skipped
      if (!skipAuth) {
        const token = this.tokenService.getAccessToken();
        if (token) {
          requestOptions.headers = {
            ...requestOptions.headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }

      // Add default headers
      const headers = {
        'Content-Type': 'application/json',
        ...requestOptions.headers,
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...requestOptions,
        headers,
        credentials: 'include', // Always include cookies for refresh tokens
      });

      // Check for X-New-Access-Token header (backend auto-refreshed token)
      const newAccessToken = response.headers.get('X-New-Access-Token');
      if (newAccessToken) {
        // Backend already refreshed the token, update it
        const tokens = this.tokenService.getTokens();
        this.tokenService.setTokens(newAccessToken, tokens?.refreshToken);
      }

      // Handle authentication errors
      if (response.status === 401 && !skipAuth && retryCount === 0) {
        // Only refresh if backend didn't already refresh (no X-New-Access-Token header)
        if (!newAccessToken) {
          // Try to refresh token
          try {
            await this.tokenService.refreshToken();
            // Retry the request with new token
            return this.request(endpoint, { ...options, retryCount: retryCount + 1 });
          } catch {
            // Refresh failed, redirect to login
            this.handleAuthFailure();
            throw new Error('Authentication failed');
          }
        } else {
          // Backend refreshed but still returned 401 - retry once with new token
          return this.request(endpoint, { ...options, retryCount: retryCount + 1 });
        }
      }

      // Handle other errors (backend returns { success: false, error: { message } })
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: { message?: string };
        };
        const message =
          errorData.error?.message ?? errorData.message ?? `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(message);
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json() as Promise<T>;
      }

      return response.text() as Promise<T>;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  /**
   * Performs a GET request
   *
   * @template T - The expected response type
   * @param endpoint - The API endpoint (relative to base URL)
   * @param options - Request configuration options
   * @returns Promise resolving to the response data
   */
  async get<T = unknown>(endpoint: string, options: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Performs a POST request
   *
   * @template T - The expected response type
   * @param endpoint - The API endpoint (relative to base URL)
   * @param data - The request body data (will be JSON stringified)
   * @param options - Request configuration options
   * @returns Promise resolving to the response data
   */
  async post<T = unknown>(endpoint: string, data?: unknown, options: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Performs a PUT request
   *
   * @template T - The expected response type
   * @param endpoint - The API endpoint (relative to base URL)
   * @param data - The request body data (will be JSON stringified)
   * @param options - Request configuration options
   * @returns Promise resolving to the response data
   */
  async put<T = unknown>(endpoint: string, data?: unknown, options: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Performs a DELETE request
   *
   * @template T - The expected response type
   * @param endpoint - The API endpoint (relative to base URL)
   * @param options - Request configuration options
   * @returns Promise resolving to the response data
   */
  async delete<T = unknown>(endpoint: string, options: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Performs a PATCH request
   *
   * @template T - The expected response type
   * @param endpoint - The API endpoint (relative to base URL)
   * @param data - The request body data (will be JSON stringified)
   * @param options - Request configuration options
   * @returns Promise resolving to the response data
   */
  async patch<T = unknown>(endpoint: string, data?: unknown, options: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Handles authentication failure
   *
   * Clears all stored tokens and dispatches a custom event to notify
   * the application of the authentication failure.
   */
  private handleAuthFailure(): void {
    this.tokenService.clearTokens();

    // Dispatch custom event for auth failure
    window.dispatchEvent(
      new CustomEvent('auth:failed', {
        detail: { reason: 'token_expired' },
      })
    );
  }

  /**
   * Checks if the user is currently authenticated
   *
   * @returns True if a valid access token exists, false otherwise
   */
  isAuthenticated(): boolean {
    return this.tokenService.isAuthenticated();
  }

  /**
   * Gets the current access token
   *
   * @returns The current access token string, or null if not available
   */
  getAccessToken(): string | null {
    return this.tokenService.getAccessToken();
  }

  /**
   * Clears all stored authentication tokens
   *
   * Removes both access and refresh tokens from storage.
   */
  clearTokens(): void {
    this.tokenService.clearTokens();
  }
}

export default HttpClient;


// graphql.ts

import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { config } from './config';
import TokenService from './tokenService';

const tokenService = TokenService.getInstance();

// Type for network errors with status code and response
interface NetworkErrorWithStatus extends Error {
  statusCode?: number;
  response?: {
    headers?: Headers | Record<string, string>;
  };
}

// Type for operation context headers
interface OperationHeaders {
  [key: string]: string;
}

// Create HTTP link
const httpLink = createHttpLink({
  uri: config.graphqlUrl,
});

// Create auth link that uses tokenService
const authLink = setContext((_, { headers }) => {
  const token = tokenService.getAccessToken();
  return {
    headers: {
      ...(headers as Record<string, string>),
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Create error link for token refresh
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (networkError) {
    // Check if it's a 401 error
    const errorWithStatus = networkError as NetworkErrorWithStatus;
    const statusCode = errorWithStatus.statusCode;
    const response = errorWithStatus.response;

    if (statusCode === 401) {
      // Check if response has X-New-Access-Token header (backend auto-refreshed)
      let newAccessToken: string | null = null;
      if (response?.headers) {
        // Headers might be a Headers object or plain object
        if (response.headers instanceof Headers) {
          newAccessToken = response.headers.get('X-New-Access-Token');
        } else if (
          typeof response.headers === 'object' &&
          response.headers !== null &&
          'x-new-access-token' in response.headers
        ) {
          const headersRecord = response.headers as Record<string, unknown>;
          const headerValue = headersRecord['x-new-access-token'];
          newAccessToken = typeof headerValue === 'string' ? headerValue : null;
        }
      }

      if (newAccessToken) {
        // Backend already refreshed the token, update it and retry
        const tokens = tokenService.getTokens();
        tokenService.setTokens(newAccessToken, tokens?.refreshToken);
        // Update the operation context with new token
        const context = operation.getContext();
        const oldHeaders = (context.headers as OperationHeaders | undefined) ?? {};
        operation.setContext({
          headers: {
            ...oldHeaders,
            authorization: `Bearer ${newAccessToken}`,
          },
        });
        // Retry the operation with new token
        return forward(operation);
      }

      // Try to refresh token manually
      // Use Observable constructor from Apollo Client's internal RxJS
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      const Observable = (globalThis as any).Observable ?? ((window as any).Observable as unknown);
      if (!Observable) {
        // Fallback: just log error and return void
        tokenService.clearTokens();
        window.dispatchEvent(
          new CustomEvent('auth:failed', {
            detail: { reason: 'token_expired' },
          })
        );
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return new Observable(
        (observer: { next: (value: unknown) => void; error: (error: Error) => void; complete: () => void }) => {
          tokenService
            .refreshToken()
            .then(() => {
              // Update the operation context with new token
              const context = operation.getContext();
              const oldHeaders = (context.headers as OperationHeaders | undefined) ?? {};
              const newToken = tokenService.getAccessToken();
              operation.setContext({
                headers: {
                  ...oldHeaders,
                  authorization: newToken ? `Bearer ${newToken}` : '',
                },
              });
              // Retry the operation with new token
              const subscription = forward(operation).subscribe({
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer),
              });
              return () => {
                subscription.unsubscribe();
              };
            })
            .catch((error: Error) => {
              // Refresh failed, clear tokens and dispatch auth failure event
              tokenService.clearTokens();
              window.dispatchEvent(
                new CustomEvent('auth:failed', {
                  detail: { reason: 'token_expired' },
                })
              );
              observer.error(error);
            });
        }
      );
    }
  }

  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      // eslint-disable-next-line no-console
      console.error(`GraphQL error: ${message}`, { locations, path });
    });
  }
});

// Create Apollo Client with error link
export const apolloClient = new ApolloClient({
  link: from([authLink, errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          getClientById: {
            // Merge function to handle client data updates
            merge(_existing: unknown, incoming: unknown) {
              return incoming;
            },
          },
          getServiceAreasByFranchiseeId: {
            // Merge function to handle service areas data updates
            merge(_existing: unknown, incoming: unknown) {
              return incoming;
            },
            // Key arguments to ensure proper cache separation
            keyArgs: ['franchiseeId'],
          },
        },
      },
      Client: {
        // Normalize Client objects by clientId for efficient caching
        keyFields: ['clientId'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-first',
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
  },
});


// Authprovider.tsx

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, type AuthContextType } from '../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
// import { store } from '../store';
import HttpClient from '../lib/httpClient';
import TokenService from '../lib/tokenService';
import FranchiseeService from '../lib/franchiseeService';
import { socketService } from '../lib/socketService';
import {
  clearError,
  clearTokens,
  clearUser,
  setTokens,
  setUser,
  setCurrentFranchiseeId,
  clearCurrentFranchiseeId,
} from '../store/slices/authSlice';

interface AuthProviderProps {
  children: ReactNode;
}

interface LoginResponse {
  accessToken: string;
  franchiseeId: string;
}

interface UserResponse {
  user?: {
    userId: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role?: string;
    franchiseeId?: string;
    permissions?: string[];
  };
  // Also support direct format (for backward compatibility)
  userId?: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  franchiseeId?: string;
  permissions?: string[];
}

export interface RegisterInput {
  email: string;
  password: string;
  franchiseeId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phoneCode?: string;
  phone?: string;
  callMasking?: boolean;
  roleId?: string;
}

// Constants
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes - check more frequently
// const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const AUTH_CHECK_DEBOUNCE = 1000; // 1 second debounce for auth checks

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error, user } = useAppSelector(state => state.auth);
  const [isInitializing, setIsInitializing] = useState(true);
  const [intendedDestination, setIntendedDestination] = useState<string | null>(null);

  // Refs for managing intervals and timeouts
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activityTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventListenersRef = useRef<Array<{ event: string; handler: () => void }>>([]);
  const initializedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const tokenService = TokenService.getInstance();
  const httpClient = HttpClient.getInstance();

  // Get intended destination from state or sessionStorage
  const getIntendedDestination = useCallback(() => {
    if (intendedDestination) {
      return intendedDestination;
    }
    // Check sessionStorage for destination stored during page refresh
    const stored = sessionStorage.getItem('intendedDestination');
    if (stored) {
      sessionStorage.removeItem('intendedDestination'); // Clean up
      return stored;
    }
    return '/dashboard'; // Default fallback
  }, [intendedDestination]);

  // Clear intended destination after successful navigation
  const clearIntendedDestination = useCallback(() => {
    setIntendedDestination(null);
    sessionStorage.removeItem('intendedDestination');
  }, []);

  // Check authentication status
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    // Prevent multiple simultaneous auth checks
    if (isRefreshingRef.current) {
      return false;
    }

    try {
      isRefreshingRef.current = true;
      const response = await httpClient.get<UserResponse>('/api/auth/me');
      // Handle both wrapped { user: {...} } and direct { userId, ... } response formats
      const userData = response.user ?? response;
      if (userData?.userId && userData?.email && userData?.username && userData?.firstName && userData?.lastName) {
        // Default to 'dispatch' role until API provides role
        const userWithDefaults = {
          userId: userData.userId,
          email: userData.email,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: (userData.role ?? 'dispatch') as 'dispatch' | 'manager' | 'admin' | 'tech',
          franchiseeId: userData.franchiseeId,
          permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
          avatar: 'avatar' in userData && typeof userData.avatar === 'string' ? userData.avatar : undefined,
          createdAt: 'createdAt' in userData && typeof userData.createdAt === 'string' ? userData.createdAt : undefined,
          updatedAt: 'updatedAt' in userData && typeof userData.updatedAt === 'string' ? userData.updatedAt : undefined,
        };
        dispatch(setUser(userWithDefaults));
        // Store franchiseeId if provided
        if (userWithDefaults.franchiseeId) {
          dispatch(setCurrentFranchiseeId(userWithDefaults.franchiseeId));
        }
        return true;
      }
      return false;
    } catch {
      // If auth check fails, clear tokens and return false
      tokenService.clearTokens();
      dispatch(clearUser());
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [dispatch, httpClient, tokenService]);

  // Debounced auth check to prevent multiple simultaneous calls
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const checkAuthStatusDebounced = useCallback(async () => {
    if (isCheckingAuth) {
      return false;
    }
    setIsCheckingAuth(true);
    try {
      const result = await checkAuthStatus();
      return result;
    } finally {
      // Add a small delay before allowing the next check
      setTimeout(() => {
        setIsCheckingAuth(false);
      }, AUTH_CHECK_DEBOUNCE);
    }
  }, [checkAuthStatus, isCheckingAuth]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      // Call logout endpoint
      await httpClient.post('/api/auth/logout');
    } catch {
      // Continue with logout even if server call fails
    } finally {
      // Clear tokens, user data, and franchisee ID
      tokenService.clearTokens();
      const franchiseeService = FranchiseeService.getInstance();
      franchiseeService.clearCurrentFranchiseeId();
      dispatch(clearUser());
      dispatch(clearTokens());
      dispatch(clearCurrentFranchiseeId());

      // Stop monitoring
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // Clean up event listeners
      eventListenersRef.current.forEach(({ event, handler }) => {
        document.removeEventListener(event, handler, true);
      });
      eventListenersRef.current = [];

      // Clean up activity interval
      if (activityTimeoutRef.current) {
        clearInterval(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }

      // Disconnect socket
      socketService.disconnect();

      // Navigate to login
      await navigate('/login');
    }
  }, [dispatch, navigate, httpClient, tokenService]);

  // Start token refresh interval
  const startTokenRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(() => {
      // Prevent multiple simultaneous refresh attempts
      if (isRefreshingRef.current) {
        return;
      }

      // Wrap the async operations in an IIFE
      void (async () => {
        try {
          isRefreshingRef.current = true;
          // Check if token is expiring soon (within 5 minutes)
          if (tokenService.isTokenExpiringSoon()) {
            await tokenService.refreshToken();
            // Update Redux state with new tokens
            const tokens = tokenService.getTokens();
            if (tokens) {
              dispatch(
                setTokens({
                  accessToken: tokens.accessToken,
                  refreshToken: tokens.refreshToken ?? '',
                })
              );
            }
          }
        } catch {
          // If refresh fails, logout the user
          void handleLogout();
        } finally {
          isRefreshingRef.current = false;
        }
      })();
    }, REFRESH_INTERVAL);
  }, [dispatch, tokenService, handleLogout]);

  // Stop token refresh interval
  const stopTokenRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // Start activity monitoring
  // const startActivityMonitoring = useCallback(() => {
  //   // First, clean up any existing listeners
  //   eventListenersRef.current.forEach(({ event, handler }) => {
  //     document.removeEventListener(event, handler, true);
  //   });
  //   eventListenersRef.current = [];

  //   const updateActivity = () => {
  //     const now = Date.now();
  //     // eslint-disable-next-line no-console
  //     console.debug('[Activity] Updating last activity:', new Date(now).toISOString());
  //     dispatch(updateLastActivity());
  //   };

  //   // Update activity on user interactions
  //   const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  //   events.forEach(event => {
  //     document.addEventListener(event, updateActivity, true);
  //     // Store reference for cleanup
  //     eventListenersRef.current.push({ event, handler: updateActivity });
  //   });

  //   // Check for inactivity
  //   activityTimeoutRef.current = setInterval(() => {
  //     // uncomment below line if required
  //     // if (lastActivity && Date.now() - lastActivity > ACTIVITY_TIMEOUT) {

  //     // Read lastActivity directly from Redux state to avoid stale closure
  //     const currentState = store.getState();
  //     const currentLastActivity = currentState.auth.lastActivity;
  //     const currentTime = Date.now();

  //     if (currentLastActivity && currentTime - currentLastActivity > ACTIVITY_TIMEOUT) {
  //       // User inactive, logging out
  //       void handleLogout();
  //     }
  //   }, 60000); // Check every minute
  //   // add lastActivity to dependencies if needed
  // }, [dispatch, handleLogout]);

  // // Stop activity monitoring
  // const stopActivityMonitoring = useCallback(() => {
  //   // Clean up event listeners
  //   eventListenersRef.current.forEach(({ event, handler }) => {
  //     document.removeEventListener(event, handler, true);
  //   });
  //   eventListenersRef.current = [];

  //   // Clean up interval
  //   if (activityTimeoutRef.current) {
  //     clearInterval(activityTimeoutRef.current);
  //     activityTimeoutRef.current = null;
  //   }
  // }, []);

  // Initialize authentication on mount
  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    const initializeAuth = async () => {
      setIsInitializing(true);

      // Check if we have valid tokens
      if (tokenService.isAuthenticated()) {
        // Try to get user info
        const isAuthenticated = await checkAuthStatusDebounced();
        if (isAuthenticated) {
          startTokenRefresh();
          // startActivityMonitoring();
        }
      }

      setIsInitializing(false);
      initializedRef.current = true;
    };

    void initializeAuth();

    // Cleanup function
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      // stopActivityMonitoring();
    };
  }, [checkAuthStatusDebounced, startTokenRefresh, tokenService]);

  // Register function
  const register = useCallback(
    async (data: RegisterInput) => {
      try {
        const franchiseeService = FranchiseeService.getInstance();
        const storedFranchiseeId = data.franchiseeId ?? franchiseeService.getStoredOrDefaultFranchiseeId();

        const response = await httpClient.post<LoginResponse>(
          '/api/auth/register',
          {
            email: data.email,
            password: data.password,
            franchiseeId: data.franchiseeId ?? storedFranchiseeId,
            firstName: data.firstName,
            lastName: data.lastName,
            username: data.username,
            phoneCode: data.phoneCode,
            phone: data.phone,
            callMasking: data.callMasking,
            roleId: data.roleId,
          },
          { skipAuth: true }
        );

        if (response.accessToken && response.franchiseeId) {
          tokenService.setTokens(response.accessToken);
          franchiseeService.setCurrentFranchiseeId(response.franchiseeId);

          // Update Redux state
          dispatch(
            setTokens({
              accessToken: response.accessToken,
              refreshToken: '',
            })
          );
          dispatch(setCurrentFranchiseeId(response.franchiseeId));

          // Get user info
          await checkAuthStatusDebounced();

          // Start monitoring
          startTokenRefresh();
          // startActivityMonitoring();

          // Navigate to intended destination
          const destination = getIntendedDestination();
          await navigate(destination);
          clearIntendedDestination(); // Clear intended destination after successful navigation
        }

        // Navigate to intended destination
        const destination = getIntendedDestination();
        await navigate(destination);
        clearIntendedDestination(); // Clear intended destination after successful navigation
      } catch (error) {
        throw error instanceof Error ? error : new Error('Register failed');
      }
    },
    [
      dispatch,
      navigate,
      httpClient,
      tokenService,
      checkAuthStatusDebounced,
      startTokenRefresh,
      getIntendedDestination,
      clearIntendedDestination,
    ]
  );

  // Login function
  const login = useCallback(
    async (email: string, password: string, franchiseeId?: string) => {
      try {
        const franchiseeService = FranchiseeService.getInstance();
        const storedFranchiseeId = franchiseeId ?? franchiseeService.getStoredOrDefaultFranchiseeId();

        const response = await httpClient.post<LoginResponse>(
          '/api/auth/login',
          { email, password, franchiseeId: franchiseeId ?? storedFranchiseeId },
          { skipAuth: true }
        );

        if (response.accessToken && response.franchiseeId) {
          // Store tokens and franchisee ID
          tokenService.setTokens(response.accessToken);
          const franchiseeService = FranchiseeService.getInstance();
          franchiseeService.setCurrentFranchiseeId(response.franchiseeId);

          // Update Redux state
          dispatch(
            setTokens({
              accessToken: response.accessToken,
              refreshToken: '',
            })
          );
          dispatch(setCurrentFranchiseeId(response.franchiseeId));

          // Get user info
          await checkAuthStatusDebounced();

          // Start monitoring
          startTokenRefresh();
          // startActivityMonitoring();

          // Navigate to intended destination
          const destination = getIntendedDestination();
          await navigate(destination);
          clearIntendedDestination(); // Clear intended destination after successful navigation
        }
      } catch (error) {
        // Re-throw error for handling in UI
        throw error instanceof Error ? error : new Error('Login failed');
      }
    },
    [
      dispatch,
      navigate,
      httpClient,
      tokenService,
      checkAuthStatusDebounced,
      startTokenRefresh,
      getIntendedDestination,
      clearIntendedDestination,
    ]
  );

  // Logout function
  const logout = useCallback(async () => {
    await handleLogout();
  }, [handleLogout]);

  // Clear error function
  const clearAuthError = () => {
    dispatch(clearError());
  };

  // Handle authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      startTokenRefresh();
      // startActivityMonitoring();
    } else {
      stopTokenRefresh();
      // stopActivityMonitoring();
    }
  }, [isAuthenticated, startTokenRefresh, stopTokenRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTokenRefresh();
      // stopActivityMonitoring();
    };
  }, [stopTokenRefresh]);

  // Context value
  const contextValue: AuthContextType = {
    register,
    login,
    logout,
    isAuthenticated,
    isLoading: isLoading || isInitializing,
    error,
    user,
    clearError: clearAuthError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export default AuthProvider;


// authSlice.ts

import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { config } from '../../lib/config';

// Types
export interface User {
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role?: 'dispatch' | 'manager' | 'admin' | 'tech';
  permissions?: string[]; // Array of permission names from backend
  franchiseeId?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Computed properties
export interface UserWithComputed extends User {
  id: string; // Alias for userId
  name: string; // Computed from firstName + lastName
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isRefreshing: boolean;
  lastActivity: number | null;
  currentFranchiseeId: string | null;
}

// API Response types
interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

interface AuthStatusResponse {
  user: User;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  accessToken: null,
  refreshToken: null,
  isRefreshing: false,
  lastActivity: null,
  currentFranchiseeId: null,
};

// Async thunks
export const loginUser = createAsyncThunk('auth/login', async (credentials: LoginCredentials, { rejectWithValue }) => {
  try {
    const response = await fetch(`${config.apiUrl}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string };
      throw new Error(errorData.message ?? 'Login failed');
    }

    const data = (await response.json()) as LoginResponse;
    return data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
  }
});

export const refreshToken = createAsyncThunk('auth/refresh', async (_, { rejectWithValue }) => {
  try {
    const response = await fetch(`${config.apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = (await response.json()) as RefreshResponse;
    return data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    await fetch(`${config.apiUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    // Even if logout fails on server, we clear local state
    return true;
  } catch {
    // Return true to clear local state even if server logout fails
    return true;
  }
});

export const checkAuthStatus = createAsyncThunk('auth/checkStatus', async (_, { rejectWithValue }) => {
  try {
    const response = await fetch(`${config.apiUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Authentication check failed');
    }

    const data = (await response.json()) as AuthStatusResponse;
    return data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Authentication check failed');
  }
});

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
    updateLastActivity: state => {
      state.lastActivity = Date.now();
    },
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.lastActivity = Date.now();
    },
    clearTokens: state => {
      state.accessToken = null;
      state.refreshToken = null;
      state.lastActivity = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearUser: state => {
      state.user = null;
      state.isAuthenticated = false;
      state.currentFranchiseeId = null;
    },
    setCurrentFranchiseeId: (state, action: PayloadAction<string>) => {
      state.currentFranchiseeId = action.payload;
    },
    clearCurrentFranchiseeId: state => {
      state.currentFranchiseeId = null;
    },
  },
  extraReducers: builder => {
    // Login
    builder
      .addCase(loginUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      });

    // Refresh token
    builder
      .addCase(refreshToken.pending, state => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.payload as string;
        // Don't clear user immediately, let the auth provider handle it
      });

    // Logout
    builder
      .addCase(logoutUser.pending, state => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, state => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.lastActivity = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, state => {
        state.isLoading = false;

        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.lastActivity = null;
      });

    // Check auth status
    builder
      .addCase(checkAuthStatus.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = action.payload as string;
      });
  },
});

export const {
  setLoading,
  setError,
  clearError,
  updateLastActivity,
  setTokens,
  clearTokens,
  setUser,
  clearUser,
  setCurrentFranchiseeId,
  clearCurrentFranchiseeId,
} = authSlice.actions;

export default authSlice.reducer;


// routeConfig.ts

import { type Role, Permission } from '../types/rbac';

export interface RouteConfig {
  path: string;
  requireAuth: boolean;
  redirectTo?: string;
  requireFranchisee?: boolean;
  /** @deprecated Prefer requiredPermissions. Roles that can access this route (legacy). */
  requiredRoles?: Role[];
  /**
   * Permission-based access. User must have:
   * - at least one of these permissions (default), or
   * - all of these permissions when requireAllPermissions is true.
   */
  requiredPermissions?: Permission[];
  /** When true, user must have all of requiredPermissions; when false/omit, user needs any one. */
  requireAllPermissions?: boolean;
}

export const routeConfig: Record<string, RouteConfig> = {
  '/': {
    path: '/',
    requireAuth: false,
    redirectTo: '/[slug]/dashboard',
  },
  '/login': {
    path: '/login',
    requireAuth: false,
    redirectTo: '/[slug]/dashboard',
  },
  '/[slug]/dashboard': {
    path: '/[slug]/dashboard',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
  },
  '/[slug]/dashboard/messaging': {
    path: '/[slug]/dashboard/messaging',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredPermissions: [Permission.MESSAGING_VIEW_ASSIGNED, Permission.MESSAGING_VIEW_ALL],
  },
  '/[slug]/dashboard/messaging/[id]': {
    path: '/[slug]/dashboard/messaging/[id]',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredPermissions: [Permission.MESSAGING_VIEW_ASSIGNED, Permission.MESSAGING_VIEW_ALL],
  },
  '/[slug]/dashboard/jobs': {
    path: '/[slug]/dashboard/jobs',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredPermissions: [Permission.JOBS_VIEW_ALL, Permission.JOBS_VIEW_ASSIGNED],
  },
  '/[slug]/dashboard/jobs/new-jobs': {
    path: '/[slug]/dashboard/jobs/new-jobs',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredPermissions: [Permission.JOBS_CREATE],
  },
  '/[slug]/dashboard/jobs/[id]': {
    path: '/[slug]/dashboard/jobs/[id]',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredPermissions: [Permission.JOBS_VIEW_DETAILS],
  },
  '/[slug]/dashboard/clients': {
    path: '/[slug]/dashboard/clients',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
  },
  '/[slug]/dashboard/clients/[id]': {
    path: '/[slug]/dashboard/clients/[id]',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
  },
  '/[slug]/dashboard/clients/new-clients': {
    path: '/[slug]/dashboard/clients/new-clients',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
  },
  '/[slug]/dashboard/settings': {
    path: '/[slug]/dashboard/settings',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/profile': {
    path: '/[slug]/dashboard/profile',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
  },
  '/[slug]/dashboard/settings/automation-center': {
    path: '/[slug]/dashboard/settings/automation-center',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/settings/a2p-registration': {
    path: '/[slug]/dashboard/settings/a2p-registration',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/settings/job-sources': {
    path: '/[slug]/dashboard/settings/job-sources',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/settings/job-types': {
    path: '/[slug]/dashboard/settings/job-types',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.JOB_TYPES_MANAGE, Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/settings/roles-permissions': {
    path: '/[slug]/dashboard/settings/roles-permissions',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.ROLE_MANAGE, Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/settings/price-book': {
    path: '/[slug]/dashboard/settings/price-book',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/settings/sub-status': {
    path: '/[slug]/dashboard/settings/sub-status',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/accounts': {
    path: '/[slug]/dashboard/accounts',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredPermissions: [Permission.ACCOUNTS_VIEW, Permission.ACCOUNTS_EDIT],
  },
  '/[slug]/dashboard/teams': {
    path: '/[slug]/dashboard/teams',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredPermissions: [Permission.MANAGE_TEAM_VIEW],
  },
  '/[slug]/dashboard/invoices': {
    path: '/[slug]/dashboard/invoices',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
  },
  '/[slug]/dashboard/teams/[id]': {
    path: '/[slug]/dashboard/teams/[id]',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredPermissions: [Permission.MANAGE_TEAM_VIEW],
  },
  '/[slug]/dashboard/settings/service-areas': {
    path: '/[slug]/dashboard/settings/service-areas',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.SERVICE_AREAS_VIEW, Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/settings/service-areas/new-service-area': {
    path: '/[slug]/dashboard/settings/service-areas/new-service-area',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.SERVICE_AREAS_VIEW, Permission.SERVICE_AREAS_CREATE, Permission.SETTINGS_ACCESS],
    requireAllPermissions: true,
  },
  '/[slug]/dashboard/settings/service-areas/[id]': {
    path: '/[slug]/dashboard/settings/service-areas/[id]',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.SERVICE_AREAS_VIEW, Permission.SERVICE_AREAS_EDIT, Permission.SETTINGS_ACCESS],
    requireAllPermissions: true,
  },
  '/[slug]/dashboard/settings/import': {
    path: '/[slug]/dashboard/settings/import',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/settings/office-phones': {
    path: '/[slug]/dashboard/settings/office-phones',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/settings/masked-numbers': {
    path: '/[slug]/dashboard/settings/masked-numbers',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.PHONE_NUMBERS_VIEW, Permission.SETTINGS_ACCESS],
  },
  '/[slug]/dashboard/settings/calls-and-texts': {
    path: '/[slug]/dashboard/settings/calls-and-texts',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin'],
    requiredPermissions: [Permission.CALL_MASKING_VIEW, Permission.SETTINGS_ACCESS],
  },
  // reports - permission-based
  '/[slug]/dashboard/reports': {
    path: '/[slug]/dashboard/reports',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['manager', 'admin'],
    requiredPermissions: [Permission.REPORTS_VIEW],
  },
  '/[slug]/dashboard/reports/jobs-report': {
    path: '/[slug]/dashboard/reports/jobs-report',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['manager', 'admin'],
    requiredPermissions: [Permission.REPORTS_VIEW],
  },
  '/[slug]/dashboard/reports/sales-report': {
    path: '/[slug]/dashboard/reports/sales-report',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['manager', 'admin'],
    requiredPermissions: [Permission.REPORTS_VIEW],
  },
  '/[slug]/dashboard/reports/tips-report': {
    path: '/[slug]/dashboard/reports/tips-report',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['manager', 'admin'],
    requiredPermissions: [Permission.REPORTS_VIEW],
  },
  '/[slug]/dashboard/reports/job-statistics-report': {
    path: '/[slug]/dashboard/reports/job-statistics-report',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['manager', 'admin'],
    requiredPermissions: [Permission.REPORTS_VIEW],
  },
  '/[slug]/dashboard/reports/payments-report': {
    path: '/[slug]/dashboard/reports/payments-report',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['manager', 'admin'],
    requiredPermissions: [Permission.REPORTS_VIEW],
  },
  '/[slug]/dashboard/reports/commissions-report': {
    path: '/[slug]/dashboard/reports/commissions-report',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['manager', 'admin'],
    requiredPermissions: [Permission.REPORTS_VIEW],
  },

  // invite
  '/[slug]/invite': {
    path: '/[slug]/invite',
    requireAuth: false,
    redirectTo: '/login',
    requireFranchisee: false,
  },
  '/[slug]/invite/create-password': {
    path: '/[slug]/invite/create-password',
    requireAuth: false,
    redirectTo: '/login',
    requireFranchisee: false,
  },
  '/[slug]/dashboard/calls': {
    path: '/[slug]/dashboard/calls',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredRoles: ['admin', 'manager', 'dispatch'],
    requiredPermissions: [Permission.CALLS_VIEW, Permission.CALLS_MAKE_CALL],
  },
  '/[slug]/dashboard/calls/dialer': {
    path: '/[slug]/dashboard/calls/dialer',
    requireAuth: true,
    requireFranchisee: true,
    redirectTo: '/login',
    requiredPermissions: [Permission.CALLS_MAKE_CALL, Permission.CALLS_VIEW],
  },
};

export const getRouteConfig = (pathname: string): RouteConfig | undefined => {
  // Find exact match first
  if (routeConfig[pathname]) {
    return routeConfig[pathname];
  }

  // Try to match routes with dynamic segments
  const pathParts = pathname.split('/').filter(Boolean);
  const routes = Object.entries(routeConfig);

  for (const [pattern, config] of routes) {
    const patternParts = pattern.split('/').filter(Boolean);

    if (pathParts.length !== patternParts.length) {
      continue;
    }

    let matches = true;
    for (let i = 0; i < patternParts.length; i++) {
      // If pattern part is a dynamic segment (wrapped in []), it matches any value
      if (patternParts[i].startsWith('[') && patternParts[i].endsWith(']')) {
        continue;
      }
      if (patternParts[i] !== pathParts[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return config;
    }
  }

  // If no match found, return the root route config
  return routeConfig['/'];
};


// ProtectRoute.tsx

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import TokenService from '../lib/tokenService';
import FranchiseeService from '../lib/franchiseeService';
import { getRouteConfig } from '../lib/routeConfig';
import { usePermissions } from '../hooks/usePermissions';
import { AccessDenied } from './AccessDenied';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireFranchisee?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireFranchisee = false,
  redirectTo = '/login',
}) => {
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, isLoading, user } = useAppSelector(state => state.auth);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isFranchiseeValid, setIsFranchiseeValid] = useState<boolean>(true);
  const tokenService = TokenService.getInstance();
  const franchiseeService = FranchiseeService.getInstance();
  const { canAccessRoute, hasAnyPermission, hasAllPermissions } = usePermissions();

  // Get route config to check role and permission requirements
  const routeConfig = getRouteConfig(location.pathname);
  const routeRequiresRole = !!routeConfig?.requiredRoles?.length;
  const routeRequiresPermission = !!routeConfig?.requiredPermissions?.length;
  const routeRequiresAccessCheck = routeRequiresRole || routeRequiresPermission;

  // Only check access if user is loaded (to prevent false negatives on refresh)
  const hasRoleAccess = routeRequiresRole && user ? canAccessRoute(routeConfig.requiredRoles) : false;
  const permissions = routeConfig?.requiredPermissions ?? [];
  const hasPermissionAccess =
    routeRequiresPermission && user
      ? routeConfig?.requireAllPermissions
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions)
      : false;
  // Allow access if user has required role OR required permission (either grants access)
  // When route has only requiredPermissions, hasRoleAccess is false so permission check decides
  const hasRouteAccess = routeRequiresAccessCheck ? hasRoleAccess || hasPermissionAccess : true;

  useEffect(() => {
    // Check token validity on mount and when location changes
    const checkTokenValidity = () => {
      const valid = tokenService.isAuthenticated();
      setIsTokenValid(valid);
    };

    // Check franchisee validity
    const checkFranchiseeValidity = () => {
      if (requireFranchisee && slug) {
        const storedFranchiseeId = franchiseeService.getCurrentFranchiseeId();
        setIsFranchiseeValid(storedFranchiseeId === slug);
      }
    };

    checkTokenValidity();
    checkFranchiseeValidity();
    // Listen for auth failure events
    const handleAuthFailure = () => {
      setIsTokenValid(false);
    };

    window.addEventListener('auth:failed', handleAuthFailure);

    return () => {
      window.removeEventListener('auth:failed', handleAuthFailure);
    };
  }, [location.pathname, tokenService, slug, franchiseeService, requireFranchisee]);

  // Show loading state while checking authentication
  // Also wait for user to load if route requires access check (to prevent false redirects on refresh)
  const needsUserForAccessCheck = routeRequiresAccessCheck && !user;
  if (isTokenValid === null || (isLoading && !isTokenValid) || (isTokenValid && needsUserForAccessCheck && isLoading)) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  // For routes that require authentication
  if (requireAuth) {
    // If token is valid, check franchisee and role requirements
    if (isTokenValid) {
      // Show Access Denied page when user lacks permission for this route (no redirect)
      if (routeRequiresAccessCheck && user && !hasRouteAccess) {
        return <AccessDenied />;
      }

      if (requireFranchisee && !isFranchiseeValid) {
        const storedFranchiseeId = franchiseeService.getCurrentFranchiseeId();
        if (storedFranchiseeId) {
          const newPath = location.pathname.replace(`/${slug}/`, `/${storedFranchiseeId}/`);
          return <Navigate to={newPath} replace />;
        }
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
      }
      return <>{children}</>;
    }

    // Only redirect if both token is invalid and user is not authenticated
    if (!isAuthenticated && !isTokenValid) {
      // Store the current location as intended destination for redirect after login
      if (location.pathname !== '/login' && location.pathname !== '/') {
        sessionStorage.setItem('intendedDestination', location.pathname);
      }
      // Redirect to login with return URL
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
  }

  // For routes that should redirect if already authenticated (like login page)
  if (!requireAuth && isAuthenticated && isTokenValid) {
    const storedFranchiseeId = franchiseeService.getCurrentFranchiseeId();
    return <Navigate to={`/${storedFranchiseeId}/dashboard`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
