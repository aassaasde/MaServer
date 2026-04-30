# MaServer

Discord bot and OAuth2 web server for the MA Roleplay community, deployed on Railway.

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. The following variables are required:

| Variable | Description |
|---|---|
| `DISCORD_BOT_TOKEN` | Bot token from the Discord Developer Portal |
| `DISCORD_CLIENT_ID` | OAuth2 client ID |
| `DISCORD_CLIENT_SECRET` | OAuth2 client secret |
| `REDIRECT_URI` | OAuth2 redirect URI (see below) |
| `GUILD_ID` | Discord server (guild) ID |
| `ACCEPTED_ROLE_ID` | Role ID granted to accepted applicants |
| `APPLICATIONS_CHANNEL_ID` | Channel ID where applications are posted |
| `DISCORD_WEBHOOK_URL` | Fallback webhook URL for application submissions |
| `SESSION_SECRET` | Secret used to sign session cookies |

### Redirect URI

The `REDIRECT_URI` must match exactly what is registered in the Discord Developer Portal under **OAuth2 → Redirects**.

- **Production**: `https://maserver-production.up.railway.app/auth/callback`
- **Local development**: `http://localhost:3000/auth/callback`

Set the production value in the Railway service's environment variables:

```
REDIRECT_URI=https://maserver-production.up.railway.app/auth/callback
```

Make sure this same URL is added to the allowed redirects list in your Discord application settings.
