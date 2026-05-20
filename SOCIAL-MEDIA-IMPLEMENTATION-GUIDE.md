# Social Media Integration Implementation Guide

## Overview

Your `/social` page now supports 8 social media platforms across 3 phases:

### Current Status
✅ **Already Connected:**
- Instagram
- Facebook
- YouTube

### Phase 1 (This Month) - Remove & Add
❌ **Remove:** TikTok
⏳ **Add:** WhatsApp Business

### Phase 2 (Next Month) - Add
⏳ **Add:** LinkedIn
⏳ **Add:** Pinterest

### Phase 3 (Later) - Add
⏳ **Add:** Telegram
⏳ **Add:** Google Business

---

## Phase 1: WhatsApp Business (This Month)

### What You Get
- Direct messaging with customers
- Send product links and checkout URLs
- Order updates and notifications
- Customer support
- Automated responses

### Setup Steps

#### Step 1: Create WhatsApp Business Account
1. Go to [WhatsApp Business](https://www.whatsapp.com/business)
2. Download WhatsApp Business app or use web version
3. Create account with your business phone number
4. Verify your phone number

#### Step 2: Get API Credentials
1. Go to [Meta Developers](https://developers.facebook.com)
2. Create new app (type: Business)
3. Add WhatsApp product
4. Get your:
   - Phone Number ID
   - Business Account ID
   - Access Token

#### Step 3: Connect in AutoBot360
1. Go to `/dashboard/social`
2. Find "WhatsApp Business" card
3. Click "Connect"
4. Paste your credentials:
   - Phone Number ID
   - Business Account ID
   - Access Token
5. Click "Connect"

#### Step 4: Test
1. Send a test message to verify
2. Check message delivery
3. Test webhook integration

### API Endpoints (Backend)
```
POST /api/v1/social/whatsapp/connect
GET /api/v1/social/whatsapp/status
POST /api/v1/social/whatsapp/send-message
POST /api/v1/social/whatsapp/webhook
GET /api/v1/social/whatsapp/templates
```

### Message Templates
```
1. Product Link
   "Hi {{name}}, check out this product: {{product_link}}"

2. Checkout
   "Your checkout link: {{checkout_url}}"

3. Order Update
   "Your order {{order_id}} status: {{status}}"

4. Support
   "We're here to help! How can we assist you?"
```

---

## Phase 2: LinkedIn & Pinterest (Next Month)

### LinkedIn Integration

#### What You Get
- Share product posts
- Get comments and engagement
- Direct messaging
- Lead generation
- B2B audience targeting

#### Setup Steps
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers)
2. Create new app
3. Get your:
   - Client ID
   - Client Secret
   - Access Token
4. Go to `/dashboard/social`
5. Click "Connect" on LinkedIn
6. Paste credentials

#### API Endpoints
```
POST /api/v1/social/linkedin/connect
GET /api/v1/social/linkedin/status
POST /api/v1/social/linkedin/share-post
GET /api/v1/social/linkedin/posts
GET /api/v1/social/linkedin/comments
```

### Pinterest Integration

#### What You Get
- Create product pins
- Share to boards
- Drive traffic to store
- Track clicks and saves
- Visual discovery

#### Setup Steps
1. Go to [Pinterest Developers](https://developers.pinterest.com)
2. Create new app
3. Get your:
   - App ID
   - App Secret
   - Access Token
4. Go to `/dashboard/social`
5. Click "Connect" on Pinterest
6. Paste credentials

#### API Endpoints
```
POST /api/v1/social/pinterest/connect
GET /api/v1/social/pinterest/status
POST /api/v1/social/pinterest/create-pin
GET /api/v1/social/pinterest/pins
GET /api/v1/social/pinterest/analytics
```

---

## Phase 3: Telegram & Google Business (Later)

### Telegram Integration

#### What You Get
- Bot for customer support
- Broadcast channels
- Direct messaging
- Community building
- Automated responses

#### Setup Steps
1. Go to [Telegram BotFather](https://t.me/botfather)
2. Create new bot
3. Get your:
   - Bot Token
   - Bot Username
4. Go to `/dashboard/social`
5. Click "Connect" on Telegram
6. Paste credentials

#### API Endpoints
```
POST /api/v1/social/telegram/connect
GET /api/v1/social/telegram/status
POST /api/v1/social/telegram/send-message
POST /api/v1/social/telegram/webhook
GET /api/v1/social/telegram/channels
```

### Google Business Integration

#### What You Get
- Business profile management
- Reviews and ratings
- Direct messaging
- Local visibility
- Business information

#### Setup Steps
1. Go to [Google Business Profile](https://business.google.com)
2. Create/claim your business
3. Get your:
   - Business ID
   - API Key
   - Access Token
4. Go to `/dashboard/social`
5. Click "Connect" on Google Business
6. Paste credentials

#### API Endpoints
```
POST /api/v1/social/google-business/connect
GET /api/v1/social/google-business/status
GET /api/v1/social/google-business/reviews
POST /api/v1/social/google-business/reply-review
GET /api/v1/social/google-business/analytics
```

---

## Frontend Changes

### Updated `/dashboard/social` Page

The social page now displays 8 platforms:

```
┌─────────────────────────────────────────┐
│  Social Connections                     │
├─────────────────────────────────────────┤
│                                         │
│  [Instagram]  [Facebook]  [YouTube]    │
│  [WhatsApp]   [LinkedIn]  [Pinterest]  │
│  [Telegram]   [Google Business]        │
│                                         │
└─────────────────────────────────────────┘
```

Each platform card shows:
- Platform icon and name
- Connection status
- Connected account username
- Connect/Disconnect button

### Connected Accounts Table

Shows all connected accounts with:
- Platform
- Username
- Display name
- Status
- Disconnect action

---

## Backend Implementation

### Database Schema

#### Social Accounts Table
```sql
CREATE TABLE social_accounts (
  id VARCHAR(255) PRIMARY KEY,
  tenantId VARCHAR(255),
  platform VARCHAR(50),
  username VARCHAR(255),
  displayName VARCHAR(255),
  status VARCHAR(50),
  accessToken VARCHAR(500),
  refreshToken VARCHAR(500),
  expiresAt TIMESTAMP,
  metadata JSON,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

#### Social Messages Table
```sql
CREATE TABLE social_messages (
  id VARCHAR(255) PRIMARY KEY,
  tenantId VARCHAR(255),
  platform VARCHAR(50),
  accountId VARCHAR(255),
  messageType VARCHAR(50),
  content TEXT,
  recipientId VARCHAR(255),
  recipientName VARCHAR(255),
  status VARCHAR(50),
  metadata JSON,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### API Client Updates

Add these methods to `apiClient`:

```typescript
// WhatsApp
apiClient.connectWhatsApp(token, data)
apiClient.getWhatsAppStatus(token)
apiClient.sendWhatsAppMessage(token, data)
apiClient.getWhatsAppTemplates(token)

// LinkedIn
apiClient.connectLinkedIn(token, data)
apiClient.getLinkedInStatus(token)
apiClient.shareLinkedInPost(token, data)
apiClient.getLinkedInComments(token, postId)

// Pinterest
apiClient.connectPinterest(token, data)
apiClient.getPinterestStatus(token)
apiClient.createPinterestPin(token, data)
apiClient.getPinterestAnalytics(token)

// Telegram
apiClient.connectTelegram(token, data)
apiClient.getTelegramStatus(token)
apiClient.sendTelegramMessage(token, data)

// Google Business
apiClient.connectGoogleBusiness(token, data)
apiClient.getGoogleBusinessStatus(token)
apiClient.getGoogleBusinessReviews(token)
```

---

## Integration with Existing Features

### Dashboard
- Show connected platforms count
- Display recent messages
- Track engagement metrics

### Product Analysis
- Send product links via WhatsApp
- Share pins on Pinterest
- Post on LinkedIn

### Orders
- Send order updates via WhatsApp
- Notify customers on all platforms
- Track order status

### Analytics
- Track engagement by platform
- Monitor message delivery
- Measure conversion by platform

---

## Timeline

### Week 1-2: WhatsApp Business
- [ ] Set up WhatsApp Business Account
- [ ] Get API credentials
- [ ] Implement backend endpoints
- [ ] Test integration
- [ ] Deploy

### Week 3-4: LinkedIn
- [ ] Set up LinkedIn App
- [ ] Get API credentials
- [ ] Implement backend endpoints
- [ ] Test integration
- [ ] Deploy

### Week 5-6: Pinterest
- [ ] Set up Pinterest App
- [ ] Get API credentials
- [ ] Implement backend endpoints
- [ ] Test integration
- [ ] Deploy

### Week 7+: Telegram & Google Business
- [ ] Set up Telegram Bot
- [ ] Set up Google Business
- [ ] Implement backend endpoints
- [ ] Test integrations
- [ ] Deploy

---

## Security Best Practices

### API Keys & Tokens
- ✅ Store encrypted in database
- ✅ Never display after setup
- ✅ Rotate regularly
- ✅ Use environment variables
- ✅ Audit access logs

### Webhooks
- ✅ Verify webhook signatures
- ✅ Validate sender identity
- ✅ Log all events
- ✅ Handle errors gracefully
- ✅ Implement rate limiting

### Data Privacy
- ✅ Comply with GDPR
- ✅ Comply with platform policies
- ✅ Secure customer data
- ✅ Maintain audit logs
- ✅ Encrypt sensitive data

---

## Monitoring & Analytics

### Metrics to Track
- Messages sent/received
- Delivery rate
- Response time
- Engagement rate
- Conversion rate
- Error rate

### Dashboards
- Platform overview
- Message analytics
- Engagement metrics
- Error tracking
- Performance monitoring

---

## Troubleshooting

### WhatsApp Issues
**Q: Messages not sending?**
- Verify API credentials
- Check webhook configuration
- Ensure phone number is verified
- Check rate limits

**Q: Webhook not receiving?**
- Verify webhook URL
- Check webhook secret
- Ensure firewall allows webhooks
- Check logs for errors

### LinkedIn Issues
**Q: Can't connect account?**
- Verify app credentials
- Check OAuth redirect URI
- Ensure app is approved
- Check permissions

### Pinterest Issues
**Q: Pins not creating?**
- Verify API credentials
- Check pin format
- Ensure board exists
- Check rate limits

### Telegram Issues
**Q: Bot not responding?**
- Verify bot token
- Check webhook URL
- Ensure bot is active
- Check message format

### Google Business Issues
**Q: Can't access reviews?**
- Verify business ID
- Check API key
- Ensure business is verified
- Check permissions

---

## Support & Documentation

For each platform, refer to:
- Official API documentation
- Setup guides
- Troubleshooting guides
- Best practices

---

## Next Steps

1. **This Week**: Start WhatsApp Business setup
2. **Next Week**: Implement WhatsApp backend
3. **End of Month**: Complete Phase 1 testing
4. **Next Month**: Start Phase 2 (LinkedIn & Pinterest)
5. **Later**: Phase 3 (Telegram & Google Business)

---

## Questions?

Check the official documentation for each platform:
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [LinkedIn API](https://docs.microsoft.com/en-us/linkedin/shared/api-reference/api-reference-v2)
- [Pinterest API](https://developers.pinterest.com/docs/api/overview)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Google Business API](https://developers.google.com/my-business)
