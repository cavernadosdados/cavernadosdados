/**
 * Proteção anti-CSRF / anti-replay para o fluxo de redefinição de senha.
 *
 * O Supabase Auth já protege contra CSRF clássico (token assinado, sessão de
 * recovery exigida, credenciais em localStorage e não em cookies). Esta camada
 * adicional garante que a redefinição só seja concluída no MESMO browser que
 * solicitou o link, mitigando cenários de:
 *  - link de recuperação aberto em dispositivo de terceiros
 *  - tentativa de replay do link após uso
 *  - phishing que induza o usuário a abrir um link forjado
 */

const STORAGE_KEY = 'cdd:pwd-reset-nonce';
const TTL_MS = 15 * 60 * 1000; // 15 minutos

type StoredNonce = {
  value: string;
  createdAt: number;
};

function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function issuePasswordResetNonce(): string {
  const nonce: StoredNonce = {
    value: generateNonce(),
    createdAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nonce));
  } catch {
    // localStorage indisponível — falha silenciosa, fluxo continua sem a camada extra
  }
  return nonce.value;
}

export function hasValidPasswordResetNonce(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as StoredNonce;
    if (!parsed?.value || !parsed?.createdAt) return false;
    if (Date.now() - parsed.createdAt > TTL_MS) {
      clearPasswordResetNonce();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearPasswordResetNonce(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}