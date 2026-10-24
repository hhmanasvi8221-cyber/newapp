import { askSpendlyAi, getAiErrorMessage } from '../src/services/aiAssistant';
import { httpsCallableMock } from '../__mocks__/firebaseFunctions';

describe('Spendly AI client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the authenticated Firebase function without sending API credentials', async () => {
    const callable = jest.fn().mockResolvedValue({
      data: { answer: 'Your dining expenses rose this month.' },
    });
    httpsCallableMock.mockReturnValue(callable);
    const answer = await askSpendlyAi('insights', '', 'USD', [
      { role: 'user', text: 'What changed?', feature: 'coach' },
    ]);

    expect(answer).toBe('Your dining expenses rose this month.');
    expect(callable).toHaveBeenCalledWith({
      feature: 'insights',
      message: '',
      currency: 'USD',
      history: [{ role: 'user', content: 'What changed?' }],
    });
    expect(JSON.stringify(callable.mock.calls)).not.toContain('GROQ_API_KEY');
  });

  it('rejects an empty provider answer and maps service errors', async () => {
    httpsCallableMock.mockReturnValue(
      jest.fn().mockResolvedValue({ data: { answer: ' ' } }),
    );
    await expect(askSpendlyAi('coach', 'help', 'USD', [])).rejects.toThrow(
      'invalid response',
    );
    expect(
      getAiErrorMessage({ code: 'functions/resource-exhausted' }),
    ).toContain('limit');
  });
});
