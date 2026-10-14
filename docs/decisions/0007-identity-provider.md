# 0007 Identity provider
Status: proposed
Requirement: R-22, R-23, R-24
Date: 2026-10-14

## Question
How do users sign in, and where do colleague names and avatars come from?

## Options
1. **Organisation single sign-on via OpenID Connect** (proposed). The server runs the
   OIDC authorization-code flow, keeps an HTTP-only session cookie, and reads name and
   picture from the ID token or userinfo. Directory search (R-24) uses the provider's
   directory API (Microsoft Graph if the tenant is Entra ID).
2. A development-only fake provider: a dropdown of fixture users, enabled by
   `AUTH_MODE=dev`. Required in any case for local work and automated tests.

## Decision (proposed)
Option 1 for deployed environments, option 2 for local development and tests. The exact
tenant, client id and directory API are configuration, not code, and must be supplied by
the team. Until they are, only the dev provider is wired.

## Consequences
The app has no passwords and no user table beyond caching `id`, `name`, `avatarUrl`.
`userId` is the provider's stable subject. `canWrite` comes from configuration (0004 style
list of read-only users, or a provider claim) and defaults to true for every signed-in user.
