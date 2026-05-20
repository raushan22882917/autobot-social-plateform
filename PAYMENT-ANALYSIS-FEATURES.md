# Payment Integration & Product Analysis Features

## Overview

Two powerful new features have been added to enhance your selling capabilities:

1. **Payment Integration** - Connect multiple payment gateways to receive payments
2. **Product Analysis** - AI-powered analysis of product comments and customer intent

---

## 1. Payment Integration (`/payments`)

### Features

- **Multiple Gateway Support**
  - Razorpay (India's leading payment gateway)
  - Stripe (Global payment processing)
  - PayPal (Worldwide payments)
  - Custom Gateway (Integrate your own system)

- **Gateway Management**
  - Add/remove payment gateways
  - Switch between test and live modes
  - View API key previews (secure)
  - Track last used gateway
  - Monitor gateway status

- **Security**
  - API keys are encrypted and never displayed after setup
  - Webhook URL configuration for real-time updates
  - Test mode for safe integration testing

### How to Set Up

#### For Razorpay:
1. Go to Razorpay Dashboard → Settings → API Keys
2. Copy your Key ID and Key Secret
3. Click "Add Gateway" → Select Razorpay
4. Paste your credentials
5. Set webhook URL in Razorpay dashboard
6. Toggle to Live mode when ready

#### For Stripe:
1. Go to Stripe Dashboard → Developers → API Keys
2. Copy your Secret Key
3. Click "Add Gateway" → Select Stripe
4. Paste your Secret Key
5. Configure webhooks in Stripe dashboard
6. Toggle to Live mode when ready

#### For PayPal:
1. Go to PayPal Developer Dashboard
2. Create an app and get your credentials
3. Click "Add Gateway" → Select PayPal
4. Paste your credentials
5. Configure webhooks
6. Toggle to Live mode when ready

#### For Custom Gateway:
1. Click "Add Gateway" → Select Custom Gateway
2. Provide your API endpoint and webhook configuration
3. Test the connection
4. Deploy when ready

### Best Practices

- **Always test in Test Mode first** before going live
- **Never share API keys** - they're sensitive credentials
- **Set up webhooks** for real-time payment notifications
- **Monitor gateway status** regularly
- **Keep backups** of your API credentials in a secure location

---

## 2. Product Analysis (`/product-analysis`)

### Features

#### Left Panel: Product List
- View all your products
- Click to select a product for analysis
- Shows product title and price
- Visual indicator for selected product

#### Right Panel: AI Analysis Results

**Summary Statistics:**
- **Purchase Leads**: Number of comments showing purchase intent
- **Total Comments**: All comments on the product
- **Sentiment Breakdown**: Positive, Neutral, Negative percentages

**AI Summary:**
- Automated analysis of overall customer sentiment
- Key insights and recommendations
- Actionable next steps

**Comment Analysis:**
Each comment is analyzed for:

1. **Intent Classification**
   - `purchase`: Customer wants to buy
   - `inquiry`: Customer has questions
   - `feedback`: Customer sharing experience
   - `complaint`: Customer has issues
   - `other`: General comments

2. **Priority Level**
   - `high`: Requires immediate action (purchase intent, urgent issues)
   - `medium`: Should be addressed soon (product questions)
   - `low`: Can be addressed later (general feedback)

3. **Suggested Actions**
   - **For Purchase Intent**: "Send Buy Link" button
     - Automatically generates checkout link
     - Can include discount codes
     - Tracks conversion
   
   - **For Inquiries**: "Connect" button
     - Sends connection request
     - Shares product details
     - Enables direct messaging
   
   - **For Feedback/Complaints**: "Reply" button
     - Send suggested reply
     - Customize response
     - Build customer relationships

### How It Works

1. **Select a Product**
   - Click on any product in the left panel
   - AI begins analyzing all comments

2. **Review Analysis**
   - See sentiment breakdown
   - Read AI summary
   - Review individual comments

3. **Take Action**
   - Click "Send Buy Link" for purchase leads
   - Click "Connect" for inquiries
   - Click "Reply" for feedback
   - Use suggested replies or customize

### AI Comment Analysis Details

The AI analyzes each comment for:

- **Sentiment**: Positive, neutral, or negative tone
- **Intent**: What the customer actually wants
- **Urgency**: How quickly you should respond
- **Suggested Reply**: AI-generated response template
- **Reason**: Why this comment needs attention

### Example Scenarios

**Scenario 1: Purchase Intent**
```
Comment: "This product looks amazing! How much does it cost?"
Intent: Purchase
Priority: High
Action: Send Buy Link
Suggested Reply: "Thank you! The product is priced at ₹[PRICE]. Would you like to know more about features?"
```

**Scenario 2: Product Inquiry**
```
Comment: "Does this come with warranty?"
Intent: Inquiry
Priority: High
Action: Connect
Suggested Reply: "Yes! We provide 1-year warranty on all products. Would you like to proceed with the purchase?"
```

**Scenario 3: Positive Feedback**
```
Comment: "Great quality! Already using it for 2 weeks."
Intent: Feedback
Priority: Low
Action: Reply (optional)
Suggested Reply: "Thank you for the positive feedback!"
```

### Best Practices

- **Respond to high-priority leads immediately** - Don't miss sales opportunities
- **Use suggested replies as templates** - Customize them for personal touch
- **Track conversion rates** - Monitor which responses lead to sales
- **Build relationships** - Reply to feedback to build customer loyalty
- **Analyze trends** - Look for patterns in customer questions
- **Update product info** - If many ask the same question, update product description

---

## Integration with Existing Features

### Dashboard
- Payment gateway status visible on dashboard
- Recent orders show payment method used
- Revenue tracking includes all payment methods

### Orders
- Filter orders by payment method
- Track payment status
- Refund management

### Analytics
- Payment method breakdown
- Conversion rates by gateway
- Revenue by payment method

### Social/Posts
- Direct "Send Buy Link" from comment analysis
- Track which posts drive most sales
- Optimize content based on engagement

---

## API Endpoints (Backend)

### Payment Integration
```
POST /api/v1/payments/gateway/add
POST /api/v1/payments/gateway/remove
GET /api/v1/payments/gateways
PUT /api/v1/payments/gateway/:id/status
POST /api/v1/payments/webhook/:gateway
```

### Product Analysis
```
GET /api/v1/products/:id/comments
POST /api/v1/products/:id/analyze-comments
POST /api/v1/products/:id/send-buy-link
POST /api/v1/products/:id/send-connect-request
```

---

## Troubleshooting

### Payment Gateway Issues

**Q: My API key isn't working**
- Verify you copied the entire key
- Check if it's the correct key (not the public key)
- Ensure you're using the right environment (test vs live)

**Q: Webhooks aren't triggering**
- Verify webhook URL is correct
- Check firewall/security settings
- Ensure webhook secret is configured
- Test webhook in gateway dashboard

**Q: Payment failed but customer was charged**
- Check payment status in gateway dashboard
- Verify webhook was received
- Check order status in Orders page
- Contact gateway support if needed

### Product Analysis Issues

**Q: Comments aren't showing up**
- Ensure product has been shared on social media
- Wait for comments to sync (can take a few minutes)
- Check if comments are from connected social accounts

**Q: AI analysis seems inaccurate**
- AI improves with more data
- Provide feedback to improve accuracy
- Check if comment language is supported

**Q: "Send Buy Link" button not working**
- Ensure payment gateway is connected
- Verify product is in stock
- Check if checkout is enabled

---

## Security & Privacy

- **API Keys**: Encrypted at rest, never displayed after setup
- **Customer Data**: Complies with GDPR and privacy regulations
- **Webhooks**: Verified with signatures to prevent tampering
- **Test Mode**: Completely isolated from live transactions

---

## Next Steps

1. **Set up at least one payment gateway** to start accepting payments
2. **Share your products on social media** to get comments
3. **Use Product Analysis** to identify and convert leads
4. **Monitor analytics** to optimize your sales funnel
5. **Iterate based on customer feedback** to improve products

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review gateway-specific documentation
- Contact support team
- Check API logs for detailed error messages
