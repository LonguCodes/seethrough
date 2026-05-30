# Seethrough Alerts

Alerts notify you when something in your Kubernetes cluster needs attention. You define **trigger conditions** — rules that describe when a situation is problematic — and Seethrough continuously checks your cluster against those rules. When a condition is met, an alert fires. When the problem goes away, the alert can resolve itself automatically.

---

## Quick Start: Creating Your First Alert

1. Navigate to **Alerts Configuration** in the sidebar
2. On the **Triggers** tab, click **New Alert Trigger**
3. Fill in the required fields and click **Save Trigger**

A minimal alert trigger needs just five things: a name, a target type, a property, a condition, and a scope.

---

## Anatomy of an Alert Trigger

### Name
A human-readable label for the trigger (e.g. "High Node CPU", "Deployment Unavailable"). This appears on alert notifications and helps you identify which rule fired.

### Target Type
The kind of Kubernetes resource to monitor. Available targets:

| Target | Examples of what you can monitor |
|--------|----------------------------------|
| **Node** | CPU usage, RAM usage, disk usage |
| **Pod** | Status phase, container restarts, container readiness, pod age |
| **Deployment** | Desired vs ready replicas, availability conditions |
| **StatefulSet** | Desired vs ready replicas, update progress |
| **DaemonSet** | Scheduled vs ready nodes, availability |
| **Persistent Volume Claim (PVC)** | Status (Bound/Pending/Lost), usage percentage |

### Property
A specific measurable attribute of the target. The available properties change depending on which target type you select. Properties can be:

- **Numbers** — e.g. CPU usage (%), replica count, disk usage
- **Enums** — e.g. pod status (Running, Pending, Failed...), deployment conditions (True/False/Unknown)

### Condition
How to compare the property against a value:

| Condition | Meaning | Example |
|-----------|---------|---------|
| **Equals** | Property equals the value | status = Failed |
| **Not Equals** | Property is not the value | status ≠ Running |
| **Greater Than** | Property is above the value | cpuUsage > 80% |
| **Greater Than or Equal** | Property is at or above the value | restartCount ≥ 5 |
| **Less Than** | Property is below the value | availableReplicas < 3 |
| **Less Than or Equal** | Property is at or below the value | numberReady ≤ 0 |
| **Range** | Property falls between min and max | cpuUsage between 50% and 90% |
| **In List** | Property is one of several values | status is one of [Failed, CrashLoopBackOff] |

The available conditions depend on the property type. Number properties support all conditions; enum properties support Equals, Not Equals, and In List.

### Condition Value
The value(s) to compare against. For single-value conditions (Equals, Greater Than, etc.), enter a number or select from a dropdown. For Range, enter min and max values. For In List, select multiple values.

### Scope
Which resources to apply the trigger to:

- **Cluster** — all resources of the target type across the entire cluster
- **Namespace** — all resources in a specific namespace
- **Node/Pod/PVC** — a single specific resource

---

## Advanced Options

### Lookback (seconds)
By default, an alert fires the moment the condition is true. With lookback, the condition must be **continuously true** for the specified number of seconds before the alert fires. This prevents flapping — brief spikes that resolve on their own won't trigger unnecessary alerts.

**Example:** Set lookback to 300 seconds (5 minutes). A node must have CPU above 80% for the entire 5-minute window before the alert fires. A brief 30-second spike is ignored.

### Auto-Resolve
When enabled, Seethrough automatically resolves the alert once the condition is no longer met. The resolution also uses a lookback window — the condition must be **continuously false** for the specified time before the alert resolves.

- **Auto-resolve lookback** — how long the condition must remain false before auto-resolving. If not set, it uses the same value as the main lookback.

**Example:** A "High CPU" alert fires after 5 minutes above 80%. With auto-resolve enabled and a 300-second lookback, the alert resolves automatically once CPU drops below 80% and stays there for 5 minutes.

### No Retrigger (seconds)
A cooldown period. After an alert fires, the same trigger will not fire again until the cooldown expires, even if the condition is still true. This prevents alert storms where the same trigger fires repeatedly in quick succession.

**Example:** Set to 600 seconds (10 minutes). Even if the condition is met every 30 seconds, you'll only receive one alert notification every 10 minutes.

### Custom Message Template
By default, Seethrough generates descriptive messages like:

> Node "node-1" has cpuUsage = 95 (exceeds 80)

You can customize this with a template using these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{targetType}` | The type of resource | Node |
| `{targetId}` | The resource name | node-1 |
| `{property}` | The monitored property | cpuUsage |
| `{value}` | The current value | 95 |
| `{threshold}` | The condition threshold | 80 |
| `{conditionType}` | The condition operator | gt |

**Example template:**

```
{targetType} "{targetId}" has {property} = {value}% (threshold: {threshold}%)
```

Would render as: `Node "node-1" has cpuUsage = 95% (threshold: 80%)`

---

## Available Targets and Their Properties

### Node

| Property | Type | Description |
|----------|------|-------------|
| CPU Usage | Number (%) | Current CPU utilization |
| RAM Usage | Number (%) | Current memory utilization |
| Disk Usage | Number (%) | Current disk utilization |

### Pod

| Property | Type | Description |
|----------|------|-------------|
| Status | Enum | Pod phase (Running, Pending, Failed, etc.) |
| Restart Count | Number | Total restarts across all containers |
| Containers Ready | Number | Count of containers in ready state |
| Container Ready Ratio | Number (%) | Percentage of containers that are ready |
| Age | Number (minutes) | How long the pod has existed |

### Deployment

| Property | Type | Description |
|----------|------|-------------|
| Desired Replicas | Number | How many pods should exist |
| Ready Replicas | Number | How many pods are ready |
| Available Replicas | Number | How many pods are available |
| Unavailable Replicas | Number | How many pods are unavailable |
| Updated Replicas | Number | How many pods are on the latest version |
| Available Condition | Enum | Whether the deployment has minimum availability |
| Progressing Condition | Enum | Whether the deployment is progressing |

### StatefulSet

| Property | Type | Description |
|----------|------|-------------|
| Desired Replicas | Number | How many pods should exist |
| Ready Replicas | Number | How many pods are ready |
| Current Replicas | Number | How many pods currently exist |
| Updated Replicas | Number | How many pods are on the latest version |
| Available Replicas | Number | How many pods are available |

### DaemonSet

| Property | Type | Description |
|----------|------|-------------|
| Desired Scheduled | Number | How many nodes should run the pod |
| Current Scheduled | Number | How many nodes currently run the pod |
| Ready | Number | How many pods are ready |
| Available | Number | How many pods are available |
| Unavailable | Number | How many pods are unavailable |
| Updated Scheduled | Number | How many nodes run the updated version |

### Persistent Volume Claim (PVC)

| Property | Type | Description |
|----------|------|-------------|
| Status | Enum | PVC status (Bound, Pending, Lost) |
| Usage Percentage | Number (%) | How much of the claimed storage is used |

---

## Managing Alert Triggers

### Enable/Disable
Each trigger card has a power toggle. Disabled triggers do not evaluate conditions and do not fire alerts. This is useful for temporarily silencing a known issue without deleting the trigger.

### Delete
Removes the trigger permanently. Previously fired alerts remain in history but won't be affected by trigger changes.

### Integration Linking
On the trigger creation form, you can select which **integrations** (Slack, Discord, Teams, webhooks) should receive notifications when this trigger fires or auto-resolves. See [Integrations.md](Integrations.md) for integration setup.

---

## Viewing Alerts

Active and resolved alerts appear in the main dashboard. You can:

- **Filter** by status (active/resolved) or by target resource
- **Manually resolve** an alert by clicking the Resolve button
- See alert details including the triggering condition, the actual value at the time, and timestamps

Alerts that auto-resolve are marked differently from manually resolved ones.

---

## Common Alert Scenarios

### "Node disk is nearly full"
- **Target:** Node
- **Property:** Disk Usage
- **Condition:** Greater Than 85
- **Scope:** Cluster
- **Lookback:** 300s (to avoid brief spikes from temp files)

### "Deployment has unavailable pods"
- **Target:** Deployment
- **Property:** Unavailable Replicas
- **Condition:** Greater Than 0
- **Scope:** Namespace → production
- **Lookback:** 120s (allows for rolling update transitions)

### "Pod is stuck in crash loop"
- **Target:** Pod
- **Property:** Status
- **Condition:** In List → [CrashLoopBackOff, ImagePullBackOff, ErrImagePull]
- **Scope:** Namespace → production
- **Lookback:** 0 (fire immediately)

### "PVC is nearly full"
- **Target:** PVC
- **Property:** Usage Percentage
- **Condition:** Greater Than 90
- **Scope:** Namespace → production
- **Lookback:** 300s

### "DaemonSet not running on all nodes"
- **Target:** DaemonSet
- **Property:** Unavailable
- **Condition:** Greater Than 0
- **Scope:** Cluster
- **Lookback:** 300s