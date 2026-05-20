import { isGeminiConfigured } from './gemini';

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error('Gemini API key not configured');
  return key;
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function parseGeminiJsonText<T>(text: string): T {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error('Gemini returned invalid JSON');
  }
}

async function callGeminiJson<T>(prompt: string): Promise<T> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${getApiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
      }),
    }
  );
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(data.error?.message || 'Gemini request failed');
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text.trim()) throw new Error('Gemini returned empty response');
  return parseGeminiJsonText<T>(text);
}

function normalizeProductReception(raw?: ProductReceptionReport): ProductReceptionReport {
  return {
    score: typeof raw?.score === 'number' ? raw.score : 50,
    verdict:
      raw?.verdict === 'good' || raw?.verdict === 'needs_attention' ? raw.verdict : 'mixed',
    summary: raw?.summary || 'Analysis complete.',
    strengths: Array.isArray(raw?.strengths) ? raw.strengths : [],
    concerns: Array.isArray(raw?.concerns) ? raw.concerns : [],
  };
}

export interface CommentAiInsight {
  commentId: string;
  intent: 'purchase' | 'question' | 'praise' | 'complaint' | 'spam' | 'other';
  sentiment: 'positive' | 'neutral' | 'negative';
  productFit: 'good_fit' | 'uncertain' | 'poor_fit';
  shouldReply: boolean;
  priority: 'high' | 'medium' | 'low';
  suggestedReply: string;
  reason: string;
}

export interface ProductReceptionReport {
  score: number;
  verdict: 'good' | 'mixed' | 'needs_attention';
  summary: string;
  strengths: string[];
  concerns: string[];
}

export interface CommentAnalysisResult {
  summary: string;
  insights: CommentAiInsight[];
  purchaseLeads: number;
  productReception?: ProductReceptionReport;
}

export async function analyzePostComments(input: {
  productTitle: string;
  productPrice?: number;
  caption?: string;
  comments: Array<{
    id: string;
    text: string;
    author: string;
    platform: string;
    parentCommentId?: string;
    parentAuthor?: string;
    isReply?: boolean;
  }>;
}): Promise<CommentAnalysisResult> {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini not configured — set GEMINI_API_KEY');
  }
  if (!input.comments.length) {
    return {
      summary: 'No comments yet.',
      insights: [],
      purchaseLeads: 0,
      productReception: {
        score: 0,
        verdict: 'mixed',
        summary: 'No customer feedback yet.',
        strengths: [],
        concerns: [],
      },
    };
  }

  const list = input.comments
    .slice(0, 80)
    .map((c, i) => {
      const thread = c.isReply
        ? ` (THREAD REPLY to @${c.parentAuthor || 'parent'} id=${c.parentCommentId})`
        : '';
      return `${i + 1}. [${c.platform}] id=${c.id}${thread} @${c.author}: ${c.text}`;
    })
    .join('\n');

  const prompt = `You are a social commerce analyst for an Indian D2C brand.

Product: ${input.productTitle}
Price: INR ${input.productPrice ?? 'N/A'}
Post caption: ${(input.caption || '').slice(0, 500)}

Comments (includes THREAD REPLIES — analyze and reply to each separately):
${list}

Return JSON:
{
  "summary": "2-3 sentence overview",
  "purchaseLeads": <count with buy intent>,
  "productReception": {
    "score": <0-100 how well product fits audience based on comments>,
    "verdict": "good|mixed|needs_attention",
    "summary": "Is this product good for these customers? Plain language for the seller.",
    "strengths": ["what customers like", ...],
    "concerns": ["complaints or doubts", ...]
  },
  "insights": [
    {
      "commentId": "<exact id from input>",
      "intent": "purchase|question|praise|complaint|spam|other",
      "sentiment": "positive|neutral|negative",
      "productFit": "good_fit|uncertain|poor_fit",
      "shouldReply": true|false,
      "priority": "high|medium|low",
      "suggestedReply": "reply under 300 chars; use {{CHECKOUT_LINK}} for purchase; for THREAD REPLIES answer that person's specific question",
      "reason": "brief"
    }
  ]
}

Rules:
- Analyze EVERY comment id including thread replies
- THREAD REPLIES asking for payment link or price → shouldReply=true, intent purchase or question, priority high
- shouldReply=true for purchase, product questions, complaints, thread follow-ups
- sentiment per comment reflects tone toward product
- productFit: good_fit if comment suggests product suits them; poor_fit if mismatch/complaint`;

  const result = await callGeminiJson<CommentAnalysisResult>(prompt);
  return {
    ...result,
    insights: Array.isArray(result.insights) ? result.insights : [],
    productReception: normalizeProductReception(result.productReception),
  };
}

export interface PurchaseAssistResult {
  summary: string;
  steps: string[];
  suggestedReply: string;
  dmScript: string;
  objections: string[];
}

export async function buildPurchaseAssistFlow(input: {
  productTitle: string;
  productDescription?: string;
  price?: number;
  customerMessage: string;
  checkoutUrl: string;
}): Promise<PurchaseAssistResult> {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini not configured');
  }

  const prompt = `You help convert social media interest into orders for an Indian D2C store.

Product: ${input.productTitle}
Description: ${(input.productDescription || '').slice(0, 400)}
Price: INR ${input.price ?? 'N/A'}
Checkout link: ${input.checkoutUrl}

Customer said: "${input.customerMessage}"

Return ONLY JSON:
{
  "summary": "what the customer wants in one sentence",
  "steps": ["step 1 for seller", "step 2", ... up to 5 steps to close sale],
  "suggestedReply": "public comment reply under 300 chars with checkout link",
  "dmScript": "private DM message with link and payment reassurance",
  "objections": ["likely objection and how to handle", ...]
}

Include UPI/cod reassurance if relevant. Use the exact checkout URL in suggestedReply and dmScript.`;

  try {
    return await callGeminiJson<PurchaseAssistResult>(prompt);
  } catch {
    return {
      summary: 'Customer wants to purchase',
      steps: ['Share checkout link', 'Confirm payment method'],
      suggestedReply: `Thanks for your interest! Order here: ${input.checkoutUrl}`,
      dmScript: `Hi! Complete your order: ${input.checkoutUrl}`,
      objections: [],
    };
  }
}
