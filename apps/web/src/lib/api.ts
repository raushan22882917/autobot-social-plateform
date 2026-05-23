const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.error?.message || res.statusText, data.error?.details);
  }
  return data as T;
}

export type UserRole = 'superadmin' | 'owner' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  storeName: string;
  tenantId: string;
  /** Effective role (Firestore + platform rules) */
  role: UserRole;
  /** Role stored in Firestore `users` document */
  firestoreRole?: UserRole;
  onboardingCompleted: boolean;
  photoURL?: string;
  authProvider?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

export interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  displayName?: string;
  status: string;
  profilePictureUrl?: string;
  connectedAt?: string;
  tokenExpiresAt?: string;
  scopes?: string[];
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  inventory: number;
  status: string;
  images: { url: string; alt: string }[];
  publicUrl: string;
  createdAt: string;
  lastAnalyzedAt?: string;
  lastSyncedAt?: string;
}

export interface ProductCommentReplyStatus {
  sent: boolean;
  platform: string;
  replyText?: string;
  checkoutUrl?: string;
  error?: string;
  skipped?: boolean;
}

export interface ProductReceptionReport {
  score: number;
  verdict: 'good' | 'mixed' | 'needs_attention';
  summary: string;
  strengths?: string[];
  concerns?: string[];
}

export interface ProductCommentRecord {
  id: string;
  commentId: string;
  postId?: string;
  author?: string;
  commentText?: string;
  platform: string;
  parentCommentId?: string;
  parentAuthor?: string;
  isReply?: boolean;
  intent?: string;
  sentiment?: string;
  productFit?: string;
  shouldReply?: boolean;
  priority?: string;
  suggestedReply?: string;
  reason?: string;
  replyStatus?: ProductCommentReplyStatus | null;
  analyzedAt?: string;
  repliedAt?: string;
  updatedAt: string;
}

export interface ProductSavedAnalysis {
  id: string;
  analyzedAt: string;
  summary: string;
  purchaseLeads: number;
  inquiries: number;
  autoReplied: number;
  totalComments: number;
  sentiment: { positive: number; neutral: number; negative: number };
  productReception?: ProductReceptionReport;
  insights?: Array<{
    commentId: string;
    postId?: string;
    author?: string;
    text?: string;
    platform?: string;
    parentCommentId?: string;
    parentAuthor?: string;
    isReply?: boolean;
    intent: string;
    sentiment?: string;
    productFit?: string;
    shouldReply: boolean;
    priority: string;
    suggestedReply: string;
    reason: string;
    replyStatus?: ProductCommentReplyStatus | null;
  }>;
}

export interface ScheduledPost {
  id: string;
  productId: string;
  productTitle?: string;
  platforms: string[];
  scheduledAt: string;
  status: string;
  useAiCaption: boolean;
  publishError?: string | null;
  youtubePrivacy?: 'private' | 'unlisted' | 'public';
  publishResults?: Record<
    string,
    { ok: boolean; error?: string; platformPostId?: string; platformPostUrl?: string }
  >;
}

export interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  customer: { name: string; email?: string; phone?: string; platform?: string; commentId?: string };
  source?: string;
  platform?: string;
  createdAt: string;
}

export interface CheckoutSession {
  id: string;
  tenantId: string;
  total: number;
  subtotal?: number;
  tax?: number;
  currency?: string;
  status: string;
  items?: { title?: string; quantity?: number; price?: number }[];
  customer?: { name?: string; email?: string; phone?: string };
  source?: string;
}

export const apiClient = {
  getAuthConfig: () =>
    api<{ mode: string; storage: 'memory' | 'firestore'; firebaseAdmin: boolean; devStore: boolean; projectId?: string }>('/auth/config'),

  loginWithFirebase: (data: { idToken: string; displayName?: string; storeName?: string }) =>
    api<AuthResponse>('/auth/firebase', { method: 'POST', body: JSON.stringify(data) }),

  signup: (data: { email: string; password: string; displayName?: string; storeName: string }) =>
    api<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  me: (token: string) =>
    api<{ user: User; tenant?: { storeName?: string; tenantId?: string }; token?: string; expiresIn?: number }>(
      '/auth/me',
      { token }
    ),

  getDashboard: (token: string) =>
    api<{
      user?: { role: string; tenantId: string };
      kpis: { products: number; orders: number; pendingPosts: number; leads: number; revenue: number; engagement: number };
      recentActivity: { id: string; title: string; body: string; createdAt: string }[];
      recentOrders: Order[];
    }>('/dashboard', { token }),

  getProducts: (token: string) => api<{ products: Product[] }>('/products', { token }),

  createProduct: (token: string, data: Partial<Product>) =>
    api<Product>('/products', { method: 'POST', token, body: JSON.stringify(data) }),

  deleteProduct: (token: string, id: string) =>
    api('/products/' + id, { method: 'DELETE', token }),

  getScheduledPosts: (token: string) => api<{ posts: ScheduledPost[] }>('/publish/scheduled', { token }),

  schedulePost: (token: string, data: object) =>
    api('/publish/schedule', { method: 'POST', token, body: JSON.stringify(data) }),

  publishNow: (token: string, id: string) =>
    api<{
      success: boolean;
      status: string;
      results?: Record<string, { ok: boolean; error?: string; platformPostId?: string; platformPostUrl?: string }>;
      message?: string;
    }>('/publish/now/' + id, { method: 'POST', token }),

  cancelPost: (token: string, id: string) =>
    api('/publish/scheduled/' + id, { method: 'DELETE', token }),

  updateYouTubePrivacy: (
    token: string,
    postId: string,
    privacy: 'private' | 'unlisted' | 'public'
  ) =>
    api<{ success: boolean; youtubePrivacy: string }>(
      '/publish/scheduled/' + postId + '/youtube-privacy',
      { method: 'PATCH', token, body: JSON.stringify({ privacy }) }
    ),

  getScheduledPost: (token: string, id: string) =>
    api<{ post: ScheduledPost & { caption?: string; product?: Product } }>(`/publish/scheduled/${id}`, { token }),

  getPostEngagement: (token: string, id: string) =>
    api<{
      platforms: Array<{
        platform: string;
        platformPostId: string;
        platformPostUrl?: string;
        metrics: { likes?: number; comments?: number; views?: number; shares?: number };
        comments: Array<{ id: string; text: string; author: string; platform: string; likeCount?: number }>;
        error?: string;
      }>;
      totals: { likes: number; comments: number; views: number };
    }>(`/publish/scheduled/${id}/engagement`, { token }),

  analyzePostComments: (token: string, id: string) =>
    api<{
      analysis: {
        summary: string;
        purchaseLeads: number;
        insights: Array<{
          commentId: string;
          intent: string;
          shouldReply: boolean;
          priority: string;
          suggestedReply: string;
          reason: string;
        }>;
      };
      engagement: { likes: number; comments: number; views: number };
    }>(`/publish/scheduled/${id}/ai/analyze-comments`, { method: 'POST', token }),

  purchaseAssist: (
    token: string,
    id: string,
    data: { customerMessage?: string; createCheckout?: boolean; quantity?: number }
  ) =>
    api<{
      assist: { summary: string; steps: string[]; suggestedReply: string; dmScript: string; objections?: string[] };
      checkoutUrl: string;
      product: { id: string; title: string; price: number };
    }>(`/publish/scheduled/${id}/ai/purchase-assist`, { method: 'POST', token, body: JSON.stringify(data) }),

  replyToComment: (
    token: string,
    postId: string,
    data: { commentId: string; platform: string; message: string }
  ) =>
    api<{ success: boolean }>(`/publish/scheduled/${postId}/comments/reply`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  getPaymentGateways: (token: string) =>
    api<{
      gateways: Array<{
        id: string;
        name: string;
        type: string;
        status: string;
        testMode: boolean;
        keyIdPreview?: string;
        webhookUrl?: string;
        createdAt?: string;
      }>;
      configured: boolean;
    }>('/payments/gateways', { token }),

  savePaymentGateway: (
    token: string,
    data: {
      type: 'razorpay' | 'stripe' | 'paypal' | 'custom';
      name?: string;
      keyId: string;
      keySecret: string;
      webhookSecret?: string;
      testMode?: boolean;
    }
  ) =>
    api<{ gateway: object }>('/payments/gateways', { method: 'POST', token, body: JSON.stringify(data) }),

  deletePaymentGateway: (token: string, id: string) =>
    api<{ success: boolean }>(`/payments/gateways/${id}`, { method: 'DELETE', token }),

  getProductAnalysis: (token: string, productId: string) =>
    api<{
      product: Product;
      stats: {
        totalPosts: number;
        publishedPosts: number;
        totalComments: number;
        platformCounts?: Record<string, number>;
        savedReplies?: number;
      };
      comments: Array<{
        commentId: string;
        postId: string;
        author: string;
        text: string;
        platform: string;
        parentCommentId?: string;
        parentAuthor?: string;
        isReply?: boolean;
      }>;
      savedAnalysis?: ProductSavedAnalysis | null;
      productReception?: ProductReceptionReport | null;
      commentRecords?: ProductCommentRecord[];
      analysisHistory?: Array<{
        id: string;
        analyzedAt: string;
        autoReplied: number;
        purchaseLeads: number;
        totalComments: number;
        commentCount?: number;
        summary: string;
        productReception?: ProductReceptionReport;
      }>;
      platformErrors?: Array<{ platform: string; postId?: string; error: string }>;
      automation?: { liveSyncAvailable?: boolean };
      sentiment?: {
        positive: number;
        neutral: number;
        negative: number;
        purchase: number;
        inquiry: number;
      };
      insights?: ProductSavedAnalysis['insights'];
    }>(`/products/${productId}/analysis`, { token }),

  analyzeProductComments: (token: string, productId: string, options?: { autoReply?: boolean }) =>
    api<{ analysis: ProductSavedAnalysis }>(`/products/${productId}/analyze`, {
      method: 'POST',
      token,
      body: JSON.stringify({ autoReply: options?.autoReply !== false }),
    }),

  syncProductAnalysis: (
    token: string,
    productId: string,
    options?: { autoAnalyze?: boolean; autoReply?: boolean }
  ) =>
    api<{
      syncedAt: string;
      totalComments: number;
      newComments: number;
      analyzed: boolean;
      autoReplied: number;
      purchaseLeads: number;
      comments: Array<{
        commentId: string;
        postId: string;
        author: string;
        text: string;
        platform: string;
        parentCommentId?: string;
        parentAuthor?: string;
        isReply?: boolean;
      }>;
      insights: ProductSavedAnalysis['insights'];
      analysis?: ProductSavedAnalysis;
      savedToFirebase?: number;
      sentiment?: {
        positive: number;
        neutral: number;
        negative: number;
        purchase: number;
        inquiry: number;
      };
      platformErrors?: Array<{ platform: string; postId?: string; error: string }>;
    }>(`/products/${productId}/analysis/sync`, {
      method: 'POST',
      token,
      body: JSON.stringify({
        autoAnalyze: options?.autoAnalyze !== false,
        autoReply: options?.autoReply !== false,
      }),
    }),

  productCommentAction: (
    token: string,
    productId: string,
    data: {
      action: 'buy' | 'connect' | 'reply';
      commentId?: string;
      postId?: string;
      platform?: string;
      message?: string;
      customerMessage?: string;
      customerName?: string;
    }
  ) =>
    api<{
      success: boolean;
      action: string;
      checkoutUrl?: string;
      suggestedReply?: string;
      dmScript?: string;
    }>(`/products/${productId}/comment-action`, { method: 'POST', token, body: JSON.stringify(data) }),

  getSocialAccounts: (token: string) =>
    api<{ accounts: SocialAccount[] }>('/social/accounts', { token }),

  getSocialStatus: (token: string) =>
    api<{
      platforms: Record<
        string,
        { configured: boolean; canConnect?: boolean; redirectUri: string; envKeys?: string[] }
      >;
    }>('/social/status', { token }),

  getSocialConnectUrl: (token: string, platform: string) =>
    api<{ authUrl?: string; platform: string; mode: string; redirectUri?: string; instructions?: string }>(
      '/social/connect/' + platform,
      { token }
    ),

  connectWhatsApp: (
    token: string,
    data: { accessToken: string; phoneNumberId: string; businessAccountId?: string }
  ) =>
    api<{ account: SocialAccount; message: string }>('/social/connect/whatsapp', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  getWhatsAppSetup: (token: string) =>
    api<{
      webhookUrl: string;
      verifyToken: string;
      metaAppId: string | null;
      envCredentialsReady: boolean;
      envHasNotifyPhone: boolean;
      whatsappNotifyPhone: string;
      whatsappAlertsEnabled: boolean;
      whatsappAutoReplyEnabled: boolean;
      whatsappDefaultProductId: string;
      whatsappPublishRecipients: string;
    }>('/social/whatsapp/setup', { token }),

  connectWhatsAppFromEnv: (token: string) =>
    api<{ account: SocialAccount; message: string }>('/social/whatsapp/connect-env', {
      method: 'POST',
      token,
    }),

  updateWhatsAppSettings: (
    token: string,
    data: {
      notifyPhone?: string;
      alertsEnabled?: boolean;
      autoReplyEnabled?: boolean;
      defaultProductId?: string;
      publishRecipients?: string;
    }
  ) =>
    api<{
      whatsappNotifyPhone: string;
      whatsappAlertsEnabled: boolean;
      whatsappAutoReplyEnabled: boolean;
      whatsappDefaultProductId: string;
      whatsappPublishRecipients: string;
    }>('/social/whatsapp/settings', {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  testWhatsAppAlert: (token: string) =>
    api<{ success: boolean; message: string }>('/social/whatsapp/test', { method: 'POST', token }),

  getMetaPendingPages: (token: string, pendingId: string) =>
    api<{
      pendingId: string;
      platform: string;
      pages: { id: string; name: string; hasInstagram: boolean; igUsername?: string }[];
    }>(`/social/meta/pending/${pendingId}`, { token }),

  completeMetaPageSelection: (token: string, data: { pendingId: string; pageId: string }) =>
    api<{ account: SocialAccount; message: string }>('/social/meta/complete', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  getGoogleBusinessPendingAccounts: (token: string, pendingId: string) =>
    api<{
      pendingId: string;
      platform: string;
      accounts: { name: string; accountName: string; type?: string }[];
    }>(`/social/google-business/pending/${pendingId}`, { token }),

  completeGoogleBusinessSelection: (token: string, data: { pendingId: string; accountName: string }) =>
    api<{ account: SocialAccount; message: string }>('/social/google-business/complete', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  disconnectSocial: (token: string, id: string) =>
    api('/social/accounts/' + id, { method: 'DELETE', token }),

  getOrders: (token: string) => api<{ orders: Order[] }>('/orders', { token }),

  updateOrderStatus: (token: string, id: string, status: string) =>
    api('/orders/' + id + '/status', { method: 'PUT', token, body: JSON.stringify({ status }) }),

  getAnalytics: (token: string) =>
    api<{
      revenue: { total: number; change: number };
      orders: { total: number; change: number };
      leads: { total: number; change: number };
      engagement: { total: number; change: number };
    }>('/analytics/overview?period=30d', { token }),

  getNotifications: (token: string) =>
    api<{ notifications: { id: string; title: string; body: string; read: boolean; createdAt: string }[] }>('/notifications', { token }),

  createCheckout: (data: { productId: string; quantity?: number }) =>
    api<{ id: string; total: number; items: unknown[] }>('/checkout/session', { method: 'POST', body: JSON.stringify(data) }),

  getCheckoutSession: (sessionId: string) =>
    api<CheckoutSession>(`/checkout/session/${sessionId}`),

  updateCheckoutSession: (sessionId: string, data: { customer?: { name: string; email?: string; phone?: string } }) =>
    api<CheckoutSession>(`/checkout/session/${sessionId}`, { method: 'PUT', body: JSON.stringify(data) }),

  simulatePayment: (checkoutSessionId: string, tenantId?: string) =>
    api('/payments/simulate-success', { method: 'POST', body: JSON.stringify({ checkoutSessionId, tenantId }) }),

  getStudioConfig: (token: string) =>
    api<{
      gemini: boolean;
      hitem3d: boolean;
      model?: string;
      imageModel?: string;
      veoModel?: string;
      features?: {
        imageGenerate?: boolean;
        imageEnhance?: boolean;
        videoGenerate?: boolean;
        imageTo3d?: boolean;
      };
    }>('/studio/config', { token }),

  studioTestConnections: (token: string) =>
    api<{
      gemini: { ok: boolean; model?: string; message?: string };
      hitem3d: { ok: boolean; message?: string };
    }>('/studio/test-connections', { token }),

  studioGenerate: (token: string, data: object) =>
    api<{ generated: object }>('/studio/generate', { method: 'POST', token, body: JSON.stringify(data) }),

  studioHitem3DToken: (token: string) =>
    api<{ connected: boolean; tokenType: string; nonce: string }>('/studio/hitem3d/token', {
      method: 'POST',
      token,
    }),

  studioEnhanceImage: (token: string, imageUrl: string, prompt?: string) =>
    api<{ media: { type: 'image'; url: string; name: string } }>('/studio/media/enhance-image', {
      method: 'POST',
      token,
      body: JSON.stringify({ imageUrl, prompt }),
    }),

  studioGenerateImage: (token: string, data: { prompt: string; aspectRatio?: string }) =>
    api<{ media: { type: 'image'; url: string; name: string } }>('/studio/media/generate-image', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  studioGenerateVideo: (token: string, data: { prompt: string; imageUrl?: string; aspectRatio?: string }) =>
    api<{ media: { type: 'video'; url: string; name: string } }>('/studio/media/generate-video', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(360000),
    }),

  studioImageTo3D: (token: string, imageUrl: string) =>
    api<{
      taskId: string;
      model: { type: 'model'; url: string; name: string };
      preview?: { type: 'image'; url: string; name: string };
    }>('/studio/media/image-to-3d', {
      method: 'POST',
      token,
      body: JSON.stringify({ imageUrl }),
      signal: AbortSignal.timeout(360000),
    }),

  uploadStudioMedia: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/studio/media/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(res.status, data.error?.message || res.statusText, data.error?.details);
    }
    return data as { media: { type: 'image' | 'video'; url: string; name: string } };
  },

  studioSaveDraft: (token: string, data: object) =>
    api<{ draft: { id: string } }>('/studio/drafts', { method: 'POST', token, body: JSON.stringify(data) }),

  studioScheduleDraft: (
    token: string,
    draftId: string,
    data: {
      scheduledAt?: string;
      publishNow?: boolean;
      youtubePrivacy?: 'private' | 'unlisted' | 'public';
    }
  ) =>
    api<{ scheduledPost: { id: string; status: string } }>('/studio/drafts/' + draftId + '/schedule', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  getPlatformStats: (token: string) =>
    api<{
      totalUsers: number;
      totalTenants: number;
      totalOrders: number;
      usersByRole: Record<string, number>;
    }>('/platform/stats', { token }),

  getPlatformUsers: (token: string, search?: string) =>
    api<{ users: User[] }>(`/platform/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, { token }),

  getPlatformTenants: (token: string) =>
    api<{
      tenants: Array<{
        tenantId: string;
        storeName: string;
        plan: string;
        status: string;
        ownerEmail?: string;
        memberCount: number;
        createdAt: string;
      }>;
    }>('/platform/tenants', { token }),

  updatePlatformUserRole: (token: string, uid: string, role: UserRole) =>
    api<{ user: User }>(`/platform/users/${uid}/role`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ role }),
    }),

  getTeamMembers: (token: string) =>
    api<{
      members: Array<{
        uid: string;
        email: string;
        displayName?: string;
        role: string;
        createdAt?: string;
        lastLoginAt?: string;
      }>;
    }>('/team/members', { token }),

  getTeamInvites: (token: string) =>
    api<{ invites: Array<{ id: string; email: string; role: string; expiresAt: string }> }>('/team/invites', {
      token,
    }),

  inviteTeamMember: (token: string, data: { email: string; role: string }) =>
    api<{ inviteId: string }>('/team/invite', { method: 'POST', token, body: JSON.stringify(data) }),

  removeTeamMember: (token: string, userId: string) =>
    api<{ message: string }>(`/team/members/${userId}`, { method: 'DELETE', token }),

  updateTeamMemberRole: (token: string, userId: string, role: string) =>
    api<{ message: string }>(`/team/members/${userId}/role`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ role }),
    }),
};
