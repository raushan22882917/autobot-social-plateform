import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './agents/auth/routes';
import { dashboardRouter } from './agents/dashboard/routes';
import { productRouter } from './agents/product/routes';
import { socialRouter } from './agents/social-connect/routes';
import { socialOAuthRouter } from './agents/social-connect/oauth-routes';
import { publishRouter } from './agents/publish/routes';
import { paymentRouter } from './agents/payment/routes';
import { orderRouter } from './agents/order/routes';
import { checkoutRouter } from './agents/checkout/routes';
import { analyticsRouter } from './agents/analytics/routes';
import { notificationRouter } from './agents/notification/routes';
import { orchestrationRouter } from './agents/orchestration/routes';
import { studioRouter } from './agents/studio/routes';
import { internalRouter } from './internal/routes';
import { publicRouter } from './routes/public';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { assertFirestoreReady, getStorageMode, isDevStore } from './lib/db';
import { hasValidServiceAccount } from './lib/firebase-admin';
import { processDueScheduledPosts } from './agents/publish/publish-executor';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  helmet({
    // Allow Firebase/Google OAuth popups to communicate with the opener in dev
    crossOriginOpenerPolicy:
      process.env.NODE_ENV === 'production' ? { policy: 'same-origin' } : { policy: 'same-origin-allow-popups' },
  })
);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Dev: allow any localhost port (e.g. 3001 when 3000 is taken)
      if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT || '300', 10),
  standardHeaders: true,
}));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'autobot360-api',
    version: '1.0.0',
    storage: getStorageMode(),
    firestoreReady: isDevStore() || hasValidServiceAccount(),
    mode: isDevStore() ? 'development' : 'production',
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/checkout', checkoutRouter);
app.use('/api/v1/public', publicRouter);
app.use('/api/v1/social/oauth', socialOAuthRouter);

app.use('/api/v1/dashboard', authMiddleware, dashboardRouter);
app.use('/api/v1/products', authMiddleware, productRouter);
app.use('/api/v1/social', authMiddleware, socialRouter);
app.use('/api/v1/publish', authMiddleware, publishRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/orders', authMiddleware, orderRouter);
app.use('/api/v1/analytics', authMiddleware, analyticsRouter);
app.use('/api/v1/notifications', authMiddleware, notificationRouter);
app.use('/api/v1/integrations', authMiddleware, orchestrationRouter);
app.use('/api/v1/studio', authMiddleware, studioRouter);

app.use('/internal', internalRouter);

app.use(errorHandler);

async function start() {
  if (!isDevStore()) {
    try {
      await assertFirestoreReady();
      console.log('Firestore connected (autobot-founder)');
    } catch (err) {
      console.error(
        err instanceof Error ? err.message : 'Firestore connection failed'
      );
      console.error(
        'Add firebase-service-account.json at repo root (see firebase-service-account.example.json) or set USE_DEV_STORE=true for local memory only.'
      );
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`AutoBot360 API → http://localhost:${PORT}`);
    console.log(
      `Storage: ${isDevStore() ? 'in-memory (USE_DEV_STORE=true)' : 'Firestore (cloud)'}`
    );
    if (process.env.DISABLE_N8N_AUTO_DISPATCH === 'true') {
      console.log('Publish: direct API (n8n dispatch disabled)');
      const intervalMs = parseInt(process.env.PUBLISH_POLL_INTERVAL_MS || '30000', 10);
      setInterval(() => {
        void processDueScheduledPosts().then((n) => {
          if (n > 0) console.log(`[publish] processed ${n} due post(s)`);
        });
      }, intervalMs);
    }
  });
}

void start();

export default app;
