# Seethrough Single Sign-On (SSO)

Single Sign-On allows users to log into Seethrough using an external identity provider (IdP) instead of a local username and password. Seethrough supports both **SAML 2.0** and **OpenID Connect (OIDC)** protocols, and you can configure multiple SSO providers simultaneously.

---

## Overview

When SSO is configured and enabled:

1. Users see "Sign in with {Provider Name}" buttons on the login page
2. Clicking a button redirects the user to the identity provider's login page
3. After successful authentication, the user is redirected back to Seethrough and logged in automatically
4. User accounts can be created automatically on first login, or only existing accounts can be allowed

Local username/password login continues to work alongside SSO unless you explicitly enable the **"Allow Only SSO Users"** setting on any active configuration.

---

## Quick Start

1. Navigate to **SSO** in the sidebar (admin access required)
2. Click **Add SSO Config**
3. Choose your protocol type (SAML or OIDC) and fill in the required fields
4. Configure user settings (auto-create, default role)
5. Click **Create**
6. Users will now see the SSO login button on the login page

---

## Protocol-Specific Configuration

### OpenID Connect (OIDC)

OIDC is recommended for most setups. It's simpler to configure and is supported by Google Workspace, Okta, Auth0, Azure AD, Keycloak, and many other providers.

**Required fields:**

| Field | Description |
|-------|-------------|
| **Issuer URL** | The base URL of your OIDC provider (e.g., `https://accounts.google.com`, `https://login.microsoftonline.com/{tenant}/v2.0`) |
| **Client ID** | The client identifier obtained from your identity provider |
| **Client Secret** | The client secret obtained from your identity provider |

**Redirect URI (Callback URL):**

You must register the following redirect URI in your identity provider's application settings:

```
{your-seethrough-url}/api/proxy/auth/sso/callback/{configuration-id}
```

The exact URL is displayed in the SSO configuration details after you create it. The `{configuration-id}` is a unique identifier generated when you save the configuration.

**OIDC flow:**

Seethrough uses the standard Authorization Code flow with PKCE. The following scopes are requested: `openid`, `profile`, `email`.

The username for auto-created accounts is derived from (in priority order):
1. Email address from the OIDC claims
2. The `sub` (subject) claim
3. The `preferred_username` claim

### SAML 2.0

SAML is commonly used for enterprise identity providers like Okta, OneLogin, Ping Identity, and Azure AD (when using SAML federation).

**Required fields:**

| Field | Description |
|-------|-------------|
| **Entry Point (IdP URL)** | The SAML SSO endpoint URL provided by your identity provider |
| **Issuer (SP Entity ID)** | A unique identifier for Seethrough as a service provider (e.g., `seethrough-sp`) |

**Optional fields:**

| Field | Description |
|-------|-------------|
| **X.509 Certificate** | The IdP's public certificate, used to verify signed SAML assertions. If not provided, encryption is not enforced. |

**Assertion Consumer Service (ACS) URL:**

Configure your identity provider to send SAML responses to:

```
{your-seethrough-url}/api/proxy/auth/sso/callback/{configuration-id}
```

The exact URL is displayed in the SSO configuration details after saving.

**SAML flow:**

Seethrough initiates SP-initiated SSO. When a user clicks the SSO button, they are redirected to the IdP's entry point with a `RelayState` parameter. After authentication, the IdP POSTs the SAML response back to the ACS URL.

The username for auto-created accounts is derived from (in priority order):
1. Email address from SAML attributes
2. The `NameID` (subject) from the SAML assertion
3. The `username`, `uid`, or `name` SAML attributes

---

## User Settings

Each SSO configuration has independent user settings that control how accounts are handled:

### Auto-Create Users

| Setting | Behavior |
|---------|----------|
| **Enabled** | Users who authenticate successfully via this SSO provider but don't have an existing Seethrough account will have one created automatically. The account is assigned the **Default Role** specified below. |
| **Disabled** | Only users who already have a Seethrough account (created by an admin via invitation) can log in via this SSO provider. Users without existing accounts receive an error. |

### Default Role

When **Auto-Create Users** is enabled, new accounts are created with the role selected here:

- **Viewer** — can view dashboards, cluster information, and alerts but cannot make changes
- **Admin** — full access to all settings, user management, SSO configuration, and alert setup

### Allow Only SSO Users

When this setting is enabled on **any active SSO configuration**, the local username/password login is disabled. All users must authenticate through an SSO provider.

**Important:** If you enable this setting and your SSO provider becomes unavailable, you will be locked out of Seethrough. Ensure at least one admin account exists that can authenticate via the configured SSO provider before enabling this option.

---

## Managing Multiple SSO Configurations

Seethrough supports multiple SSO configurations simultaneously. Common use cases:

- **Multiple IdPs:** Configure both a Google Workspace OIDC provider for one team and an Okta SAML provider for another team
- **Gradual migration:** Add a new IdP while keeping the old one active during a transition period
- **Different roles per provider:** Set one configuration to auto-create users as Viewers while another creates them as Admins

Each configuration has its own **Auto-Create Users**, **Default Role**, and **Allow Only SSO** settings. They can be enabled or disabled independently.

---

## Enabling and Disabling

Each SSO configuration has a toggle on the list view:

- **Green toggle (Enabled):** The provider appears on the login page and users can authenticate with it
- **Grey toggle (Disabled):** The provider is hidden from the login page. No new authentications can occur, but existing sessions and accounts are unaffected

Disabling a configuration does not delete it — all settings are preserved and can be re-enabled at any time.

---

## Troubleshooting

### "User does not exist and auto-creation is disabled"

The user authenticated successfully with the IdP but does not have a Seethrough account, and the SSO configuration has **Auto-Create Users** disabled.

**Solution:** Either:
- Enable **Auto-Create Users** on the SSO configuration
- Create the user account manually via the **Users** page (invite the user with the same username the IdP would provide)

### "Failed to initiate SSO login"

Seethrough could not build the authorization URL. This usually indicates missing required fields in the SSO configuration.

**Solution:** Edit the SSO configuration and verify all required fields are filled in.

### "Failed to exchange OIDC authorization code" (OIDC only)

The OIDC token exchange failed. Common causes:

- **Incorrect Client Secret:** Verify the secret is correct and has been saved in the configuration
- **Redirect URI mismatch:** Verify the redirect URI registered in the IdP exactly matches the one shown in the SSO configuration details
- **Issuer URL incorrect:** Verify the Issuer URL matches your provider's discovery document

### No SSO buttons on the login page

- Verify at least one SSO configuration has the **green (enabled)** toggle
- If you just enabled SSO, reload the login page

---

## Security Considerations

- **Client secrets** are stored encrypted in the database and are not returned in API responses (except when first created)
- **Callback URLs** include the configuration ID to prevent mix-up between multiple SSO configurations
- **State parameters** are generated per-request to prevent CSRF attacks
- SAML assertions should be signed by the IdP; provide the X.509 certificate in the configuration to enable signature verification