import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import theme from '../assets/theme';
import {
  AiFeature,
  AiMessage,
  askSpendlyAi,
  getAiErrorMessage,
} from '../services/aiAssistant';

const featureOptions: Array<{
  key: AiFeature;
  title: string;
  description: string;
  prompt: string;
}> = [
  {
    key: 'coach',
    title: 'Money coach',
    description: 'Ask about your spending',
    prompt: '',
  },
  {
    key: 'insights',
    title: 'Smart insights',
    description: 'Find spending patterns',
    prompt: 'Analyze my recent spending patterns.',
  },
  {
    key: 'budget',
    title: 'Budget planner',
    description: 'Plan limits and savings',
    prompt: 'Suggest a practical monthly budget and savings goal.',
  },
  {
    key: 'prediction',
    title: 'Spending forecast',
    description: 'Estimate this month',
    prompt: 'Forecast my spending for this month.',
  },
  {
    key: 'alerts',
    title: 'Smart alerts',
    description: 'Review unusual activity',
    prompt: 'Check for possible unusual expenses or duplicates.',
  },
  {
    key: 'report',
    title: 'Monthly report',
    description: 'Summarize this month',
    prompt: 'Create my monthly income, expense, and savings report.',
  },
];

export default function AiAssistantPanel({
  currency,
  enabled,
}: {
  currency: string;
  enabled: boolean;
}) {
  const [feature, setFeature] = useState<AiFeature>('coach');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ask = async (selected: AiFeature, prompt: string) => {
    if (!enabled || loading) {
      return;
    }
    if (selected === 'coach' && !prompt.trim()) {
      setError('Type a question for your money coach.');
      return;
    }
    setFeature(selected);
    setError('');
    setLoading(true);
    const option = featureOptions.find(item => item.key === selected);
    const visiblePrompt = prompt.trim() || option?.prompt || '';
    const previousMessages = messages.slice(-8);
    const userMessage: AiMessage = {
      role: 'user',
      text: visiblePrompt,
      feature: selected,
    };
    setMessages(current => [...current, userMessage].slice(-16));
    setInput('');
    try {
      const answer = await askSpendlyAi(
        selected,
        selected === 'coach' ? prompt.trim() : '',
        currency,
        previousMessages,
      );
      const assistantMessage: AiMessage = {
        role: 'assistant',
        text: answer,
        feature: selected,
      };
      setMessages(current => [...current, assistantMessage].slice(-16));
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
      setMessages(current => current.filter(item => item !== userMessage));
      setInput(selected === 'coach' ? prompt : '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.sparkle}>
          <Text style={styles.sparkleText}>✦</Text>
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Spendly AI</Text>
          <Text style={styles.subtitle}>
            Personal guidance based on your saved transactions
          </Text>
        </View>
      </View>
      {!enabled ? (
        <Text style={styles.notice}>
          AI features are available only after signing into your Firebase
          account. Local demo data is never sent to the AI service.
        </Text>
      ) : (
        <>
          <Text style={styles.disclaimer}>
            Educational guidance, not financial advice. Your transaction
            summaries are processed by the configured AI provider.
          </Text>
          <View style={styles.options}>
            {featureOptions.map(option => (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{
                  selected: feature === option.key,
                  disabled: loading,
                }}
                disabled={loading}
                onPress={() => {
                  setFeature(option.key);
                  if (option.key !== 'coach') {
                    ask(option.key, option.prompt);
                  }
                }}
                style={[
                  styles.option,
                  feature === option.key && styles.optionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.optionTitle,
                    feature === option.key && styles.optionTitleSelected,
                  ]}
                >
                  {option.title}
                </Text>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </Pressable>
            ))}
          </View>
          {messages.length ? (
            <View style={styles.conversation}>
              {messages.map((message, index) => (
                <View
                  key={`${message.role}-${index}`}
                  style={[
                    styles.bubble,
                    message.role === 'user'
                      ? styles.userBubble
                      : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      message.role === 'user' && styles.userBubbleText,
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>
              Ask a question or choose an analysis above. Spendly AI uses
              transaction summaries tied to your signed-in account.
            </Text>
          )}
          {feature === 'coach' ? (
            <View style={styles.inputArea}>
              <TextInput
                accessibilityLabel="Ask your money coach"
                editable={!loading}
                multiline
                onChangeText={setInput}
                placeholder="e.g. How can I reduce dining costs?"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
                value={input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: loading }}
                disabled={loading}
                onPress={() => ask('coach', input)}
                style={styles.sendButton}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={styles.sendText}>Ask</Text>
                )}
              </Pressable>
            </View>
          ) : null}
          {loading ? (
            <Text style={styles.loading}>Preparing your account summary…</Text>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  sparkle: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentDark,
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    marginRight: 11,
    width: 38,
  },
  sparkleText: {
    color: theme.colors.accent,
    fontSize: 19,
  },
  headingCopy: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
  disclaimer: {
    color: theme.colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 14,
  },
  notice: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  option: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: 11,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 62,
    padding: 10,
    width: '48.5%',
  },
  optionSelected: {
    backgroundColor: theme.colors.accentDark,
    borderColor: '#52683D',
  },
  optionTitle: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  optionTitleSelected: {
    color: theme.colors.accent,
  },
  optionDescription: {
    color: theme.colors.muted,
    fontSize: 9,
    marginTop: 5,
  },
  empty: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  conversation: {
    marginBottom: 12,
  },
  bubble: {
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.accentDark,
    maxWidth: '90%',
  },
  assistantBubble: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  bubbleText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 19,
  },
  userBubbleText: {
    color: theme.colors.accent,
  },
  inputArea: {
    alignItems: 'flex-end',
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 8,
  },
  input: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 12,
    maxHeight: 100,
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: 9,
    justifyContent: 'center',
    marginLeft: 8,
    minHeight: 40,
    minWidth: 54,
    paddingHorizontal: 12,
  },
  sendText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: '800',
  },
  loading: {
    color: theme.colors.accent,
    fontSize: 11,
    marginTop: 10,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },
});
