/** Sign in with email/password via Firebase Identity Toolkit (for accounts without dev passwordHash). */
export async function signInWithFirebasePassword(
  email: string,
  password: string
): Promise<string> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'Set FIREBASE_WEB_API_KEY in services/api/.env (Firebase Console → Project settings → General → Web API Key).'
    );
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  const data = (await res.json()) as {
    idToken?: string;
    error?: { message?: string };
  };

  if (!res.ok || !data.idToken) {
    const msg = data.error?.message || 'Invalid email or password';
    if (msg.includes('INVALID_LOGIN_CREDENTIALS') || msg.includes('INVALID_PASSWORD')) {
      throw new Error('Invalid email or password');
    }
    throw new Error(msg);
  }

  return data.idToken;
}
