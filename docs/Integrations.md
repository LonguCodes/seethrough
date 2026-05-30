# Seethrough Alert Integrations

Alert integrations allow Seethrough to send alert notifications (both fired and auto-resolved) to external messaging platforms.

## Supported Integrations

| Type | Name | Protocol |
|------|------|----------|
| `slack` | Slack | Webhook (Incoming Webhook) |
| `discord` | Discord | Webhook |
| `teams` | Microsoft Teams | Webhook (Incoming Webhook connector) |
| `webhook` | Generic Webhook | HTTP POST (JSON) |

---

## Configuring Each Integration in Seethrough

1. Navigate to **Alerts Configuration** → **Integrations** tab
2. Click **New Integration**
3. Fill out the form (see platform-specific instructions below for obtaining the webhook URL)
4. Toggle **Send all alerts** if you want this integration to receive every alert automatically (otherwise, you select it per-trigger in the Triggers tab)
5. Click **Save Integration**

Once created, go to the **Triggers** tab, create or edit a trigger, and under **Notify Integrations**, select the integration(s) to notify when that trigger fires or auto-resolves.

---

## Platform-Specific Setup Instructions

### Slack

1. Go to your Slack workspace
2. Navigate to **Apps** → search for **Incoming Webhooks**
3. Click **Add to Slack**
4. Select the channel where you want alert messages posted
5. Click **Add Incoming Webhooks Integration**
6. Copy the generated **Webhook URL** (looks like `https://hooks.slack.com/services/T.../B.../...`)
7. Paste it into the Seethrough integration form's **Webhook URL** field

**Slack message format:** Messages arrive as a formatted attachment with a colored sidebar (red for critical, orange for warning, blue for info), embedded fields for target/property/value/severity, and a context footer with the trigger name and timestamp.

### Discord

1. Go to your Discord server
2. Open **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Give it a name (e.g. "Seethrough Alerts")
5. Select the channel where you want alert messages posted
6. Click **Copy Webhook URL** (looks like `https://discord.com/api/webhooks/.../...`)
7. Paste it into the Seethrough integration form's **Webhook URL** field

**Discord message format:** Messages arrive as a Discord embed with a colored stripe (red for critical, orange for warning, blue for info), inline fields, and a footer with the alert ID. Auto-resolved alerts include a "✅ Alert Resolved" message at the top.

### Microsoft Teams

1. Go to your Microsoft Teams channel
2. Click the **...** (more options) next to the channel name
3. Select **Connectors**
4. Search for **Incoming Webhook** and click **Add** (or **Configure** if already added)
5. Give it a name (e.g. "Seethrough Alerts")
6. Optionally upload an image
7. Click **Create**
8. Copy the generated **Webhook URL** (looks like `https://...webhook.office.com/webhookb2/...`)
9. Paste it into the Seethrough integration form's **Webhook URL** field

**Teams message format:** Messages arrive as a MessageCard with a themed color (red/orange/blue), facts table containing target, property, value, severity, trigger name, and timestamp.

### Generic Webhook

1. Prepare an endpoint that accepts `POST` requests with `Content-Type: application/json`
2. In the Seethrough integration form, select **Webhook** as the type
3. Enter your endpoint **URL**
4. Optionally add **Custom Headers** as a JSON object (e.g. `{"X-API-Key": "your-secret-key"}`)

**Webhook message format:** The payload is:

```json
{
  "event": "alert.fired" | "alert.resolved",
  "alert": {
    "id": "uuid",
    "title": "Alert: Trigger Name" | "Resolved: Trigger Name",
    "message": "Node \"node-1\" has cpuUsage = 95 (exceeds 80)",
    "severity": "warning" | "critical" | "info",
    "status": "active" | "resolved",
    "target": {
      "type": "Node" | "Pod" | "Deployment" | "StatefulSet" | "DaemonSet" | "PVC",
      "id": "node-1"
    },
    "property": "cpuUsage",
    "actualValue": 95,
    "triggerName": "High CPU Alert",
    "timestamp": "2026-05-30T16:00:00.000Z"
  }
}
```

---

## "Send All Alerts" vs Per-Trigger Selection

- **Send all alerts enabled:** The integration receives every alert from every trigger automatically. It appears in purple on trigger cards with an "(auto)" badge. It is **not** selectable in the per-trigger integration picker.
- **Send all alerts disabled:** The integration must be explicitly linked to a trigger. You select it when creating/editing a trigger under **Notify Integrations**.

This allows you to set up a "main alert channel" (e.g. a Slack channel) that receives everything, plus per-team integrations that only fire for specific triggers.