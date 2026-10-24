import functions from '@react-native-firebase/functions';

export type AiFeature =
  | 'coach'
  | 'insights'
  | 'budget'
  | 'prediction'
  | 'alerts'
  | 'report';

export type AiMessage = {
  role: 'user' | 'assistant';
  text: string;
  feature: AiFeature;
};

export async function askSpendlyAi(
  feature: AiFeature,
  message: string,
  currency: string,
  history: AiMessage[],
) {
  const callable = functions().httpsCallable('aiAssistant');
  const result = await callable({
    feature,
    message,
    currency,
    history: history.slice(-8).map(({ role, text }) => ({
      role,
      content: text.slice(0, 1000),
    })),
  });
  const data = result.data as { answer?: unknown };
  if (typeof data.answer !== 'string' || !data.answer.trim()) {
    throw new Error('The AI service returned an invalid response.');
  }
  return data.answer.trim();
}

export function getAiErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';
  if (code.includes('unauthenticated')) {
    return 'Sign in again to use AI features.';
  }
  if (code.includes('resource-exhausted')) {
    return 'The AI usage limit has been reached. Please try again later.';
  }
  if (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    code.includes('network')
  ) {
    return 'The AI service is temporarily unavailable. Check your connection and try again.';
  }
  if (code.includes('failed-precondition')) {
    return error instanceof Error
      ? error.message
      : 'The AI service is not configured correctly yet.';
  }
  if (code.includes('invalid-argument')) {
    return error instanceof Error
      ? error.message
      : 'Check your request and try again.';
  }
  return error instanceof Error
    ? error.message
    : 'Could not get an AI response. Please try again.';
}
