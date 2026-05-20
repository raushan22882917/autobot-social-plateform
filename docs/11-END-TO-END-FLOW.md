# AutoBot360 — End-to-End Workflow Example

## Scenario: Seller publishes wallet → Customer buys via Instagram comment

### Step 1: Seller schedules post (T+0)

```
UI: POST /api/v1/publish/schedule
  → Firestore: scheduled_posts/sp_001 { status: pending }
  → Pub/Sub: publish.requested
  → n8n: Publish Product Workflow starts
```

### Step 2: AI generates caption (T+30s)

```
n8n → AI Caption Workflow → Gemini API
  → Output: "✨ Elevate your everyday carry... #leatherwallet"
```

### Step 3: Instagram publish (T+45s)

```
n8n → GET /internal/tokens/sa_instagram_001 (Secret Manager decrypt)
  → Meta API: create container → publish
  → Firestore: social_posts/social_001 { platformPostId: ig_123 }
  → Pub/Sub: publish.completed
```

### Step 4: Comment monitoring starts (T+60s)

```
Comment Monitor Agent registers Meta webhook
  → Waits for comment events
```

### Step 5: Customer comments (T+2h)

```
Meta webhook → Cloud Function → Pub/Sub: comment.received
  → n8n: Comment Monitoring
  → Gemini intent: buying (0.94)
  → Lead Capture: customers/cust_001, lead_001
  → AI Reply: "Hi Jane! The wallet is ₹2,499. Buy here: [link]"
```

### Step 6: Customer checkout (T+2h 5m)

```
Customer clicks link → /checkout/cs_001
  → Checkout Agent: session + GST calculation
  → Razorpay order created
```

### Step 7: Payment (T+2h 6m)

```
Razorpay UPI payment → webhook → Payment Agent verifies HMAC
  → Pub/Sub: payment.success
  → n8n: Order Creation Workflow
```

### Step 8: Order fulfillment (T+2h 7m)

```
Firestore: orders/ord_001 { status: confirmed }
  → WhatsApp to customer: order confirmation
  → WhatsApp to seller: new order alert
  → Email confirmation
  → Dashboard notification (realtime)
  → Analytics: revenue +₹2,949
```

### Timeline Diagram

```
T+0     T+1m    T+2h      T+2h5m   T+2h7m
 │       │       │         │        │
 ▼       ▼       ▼         ▼        ▼
Schedule Publish Comment  Checkout Order
 Post    Live    +AI      Pay      Done
```
