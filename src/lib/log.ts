/**
 * Loga apenas em desenvolvimento. Em produção o erro é engolido de propósito:
 * mensagens de erro do Supabase podem carregar detalhes de schema, e o usuário
 * final já recebe o aviso pelo toast.
 */
export function safeLogError(message: string, error?: unknown) {
  if (import.meta.env.DEV) {
    console.error(message, error);
  }
}
