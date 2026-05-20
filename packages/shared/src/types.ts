export type UserRole = 'owner' | 'admin';
export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type SocialPlatform = 'instagram' | 'facebook' | 'youtube' | 'tiktok';
export type PostStatus = 'pending' | 'processing' | 'published' | 'failed' | 'cancelled';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type CommentIntent = 'buying' | 'question' | 'praise' | 'complaint' | 'spam' | 'unknown';

export interface TenantScoped {
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface User extends TenantScoped {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  subscriptionId: string;
  onboardingCompleted: boolean;
}

export interface Product extends TenantScoped {
  id: string;
  title: string;
  slug: string;
  description: string;
  aiDescription?: string;
  price: number;
  compareAtPrice?: number;
  currency: 'INR';
  sku: string;
  inventory: number;
  trackInventory: boolean;
  status: 'draft' | 'active' | 'archived';
  images: Array<{ url: string; alt: string; order: number }>;
  variants: Array<{
    id: string;
    name: string;
    options: Record<string, string>;
    price: number;
    sku: string;
    inventory: number;
  }>;
  publicUrl: string;
}

export interface ScheduledPost extends TenantScoped {
  id: string;
  productId: string;
  platforms: SocialPlatform[];
  socialAccountIds: string[];
  caption?: string;
  useAiCaption: boolean;
  hashtags: string[];
  mediaUrls: string[];
  scheduledAt: string;
  timezone: string;
  status: PostStatus;
  retryCount: number;
  lastError?: string;
  idempotencyKey: string;
}

export interface Order extends TenantScoped {
  id: string;
  orderNumber: string;
  customerId: string;
  items: Array<{
    productId: string;
    variantId?: string;
    title: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: 'INR';
  status: OrderStatus;
  paymentId: string;
}
