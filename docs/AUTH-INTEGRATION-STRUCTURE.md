# Auth integration — current implementation and scenario validation

This document reflects the current auth implementation in **Ovlox-Client** and validates key scenarios against the actual code paths.

---

## High-level architecture

Auth is implemented with a centralized Zustand session store plus Axios interceptors.

| Concern | Mechanism |
|--------|-----------|
| Client session state | Zustand `useAuthStore` in `entities/session/model/store.ts` |
| Access token | In-memory via `shared/lib/auth/token-service.ts` (`setAccessToken` / `getAccessToken`) |
| Refresh token | Cookie-backed, server-managed (expected HttpOnly); client does not read it directly |
| HTTP transport | `apiClient` + `refreshClient` in `shared/api/client.ts` |
| 401 handling | Single-flight refresh queue in `shared/api/client.ts` |
| Route gating | `Protected` in `widgets/session-gate/ui/protected-route.tsx` |
| Route policy | Declarative matching in `shared/lib/auth/route-config.ts` |
| Post-auth navigation | TTL-safe redirect helpers in `shared/lib/auth/auth-navigation.ts` |
| Franchisee guard | Server layout validates `franchiseeId` before rendering app shell |

---

## File structure (auth-related)

Relevant paths under `Ovlox-Client/`:

```text
app/
  (auth)/
    signin/page.tsx
    signup/page.tsx
    otp/page.tsx
    login-success/page.tsx
  [franchiseeId]/layout.tsx    → server redirect on invalid franchisee id; wraps with Protected
  new-organization/layout.tsx  → Protected wrapper

entities/session/
  model/store.ts               → auth lifecycle: login/signUp/verifyOtp/logout/fetch/bootstrap/refresh

features/auth/
  lib/auth-utils.ts            → safe post-auth path resolver + API error formatter
  ui/signin-form.tsx
  ui/signup-form.tsx
  ui/otp-form.tsx
  ui/login-success-view.tsx

shared/api/
  client.ts                    → axios clients, auth header attach, 401 refresh queue
  auth.ts                      → auth endpoints + payload normalizers

shared/lib/auth/
  auth-navigation.ts           → safe `from` handling + TTL-backed auth navigation storage
  payloads.ts                  → defensive API response normalization
  route-config.ts              → declarative route policies + role checks
  session-storage.ts           → localStorage session user id marker
  token-service.ts             → in-memory access token + token metadata + clear client session
  token-storage.ts             → js-cookie cleanup helpers for legacy/non-HttpOnly leftovers

widgets/session-gate/
  index.ts                     → exports Protected from `ui/protected-route.tsx`
```

---

## Layer responsibilities

### `entities/session/model/store.ts`

Single source of truth for client auth state:

- `auth.user` and `auth.isLoading`
- `login`, `signUp`, `verifyOtp` call API wrappers and then `applyAuthResponseToSession`
- `bootstrapSession` deduplicates bootstrap calls and delegates to `fetchUser`
- `fetchUser` calls `/user/me` and sets `user` or clears it on error
- `logout` always clears client session state, even if API logout fails
- `handleRefreshToken` supports explicit refresh from store consumers

`applyAuthResponseToSession` currently stores user id in localStorage (`session-storage.ts`) and keeps access token in-memory (`token-service.ts`).

### `shared/api/client.ts`

Transport and refresh behavior:

- `apiClient` adds `Authorization: Bearer <accessToken>` from in-memory token service.
- `refreshClient` explicitly removes auth header to enforce cookie/session-based refresh contract.
- On 401 from non-refresh requests, a single-flight queue is used (`isRefreshing` + `failedQueue`).
- Refresh endpoint attempts are tried in order: `POST /auth/refresh`, `GET /auth/refresh-token`, `GET /auth/refresh`.
- First successful refresh becomes preferred for later attempts (`preferredRefreshAttempt`).
- On refresh 401/403, `clearClientSessionState()` is executed.

### `shared/lib/auth/auth-navigation.ts`

Safe post-auth navigation:

- Accepts only same-origin paths.
- Rejects auth pages (`/signin`, `/signup`, `/otp`) as post-auth targets.
- Stores destination with TTL (30 minutes) in session storage.
- Resolves destination from `from` query first, then stored navigation, then fallback (usually `/login-success`).

### `widgets/session-gate/ui/protected-route.tsx`

Runtime route protection:

1. Calls `bootstrapSession()` on mount.
2. Reads route policy from `route-config.ts`.
3. If route requires auth and user is missing after loading:
   - stores current location with `setAuthNavigation`
   - redirects to `buildSigninRedirectPath(currentPath)`
4. If user is present but role is unauthorized, shows access denied UI.
5. Otherwise renders children.

---

## Key auth scenario validation

Validation here is based on direct code-path verification of current implementation.

| Scenario | Validation result | Source of truth |
|----------|-------------------|-----------------|
| Sign-in | `SigninForm` calls `auth.login`, then redirects via `getSafePostAuthRedirectPath(from)` | `features/auth/ui/signin-form.tsx`, `entities/session/model/store.ts` |
| Sign-up | `SignupForm` calls `auth.signUp`, then same safe redirect strategy | `features/auth/ui/signup-form.tsx`, `entities/session/model/store.ts` |
| OTP verify | `OTPForm` calls `auth.verifyOtp`, then redirects with same resolver | `features/auth/ui/otp-form.tsx`, `entities/session/model/store.ts` |
| Page refresh / bootstrap | Protected areas call `bootstrapSession()` which resolves through `/user/me` | `widgets/session-gate/ui/protected-route.tsx`, `entities/session/model/store.ts`, `shared/api/auth.ts` |
| Expired access token refresh | 401 triggers single-flight refresh queue and request retry with new access token | `shared/api/client.ts` |
| Refresh failure | On refresh 401/403, client session is cleared and original request fails | `shared/api/client.ts`, `shared/lib/auth/token-service.ts` |
| Logout | Store calls logout API, then always clears client session state in `finally` | `entities/session/model/store.ts`, `shared/api/auth.ts` |
| Protected-route redirect | Missing session on protected route stores intended path and redirects to `/signin?from=...` | `widgets/session-gate/ui/protected-route.tsx`, `shared/lib/auth/auth-navigation.ts` |

---

## Notes and known behavior

- Access token is intentionally memory-only on client; it is not rehydrated from cookies.
- Refresh contract is cookie/session-based; refresh requests do not include bearer header.
- `fetchUser` clears user state on any error, not just 401/403, which may log users out on transient backend failures.
- Redirect destination safety is centralized and hardened in `auth-navigation.ts`.

---

## Public import patterns

| Need | Import from |
|------|-------------|
| Session state/actions | `@/entities/session` |
| Auth UI and helper exports | `@/features/auth` |
| Client-side route gate | `@/widgets/session-gate` |
| New auth endpoint wrapper | `shared/api/auth.ts` + normalization in `shared/lib/auth/payloads.ts` |

