import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { Text } from './design/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  indianMobileInput,
  indianMobilePhone,
  mockPhoneAccounts,
  type OtpChallenge,
  type QuickLoginAccount,
} from '../../shared/auth';
import { Button, Card, Heading } from './design/components';
import { radius, size, space, textRoles, useTheme } from './design/theme';
import { useSession } from './session';
import { ScreenBackground } from './design/ScreenBackground';
import { BrandMark } from './design/BrandMark';
import { OtpCodeInput } from './OtpCodeInput';
import { useAnimations } from './motion';
import { api } from './api';

export function PhoneSignIn() {
  const { colors: C } = useTheme();
  const animations = useAnimations();
  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const { busy, error, setError, requestOtp, verifyOtp, quickLogin } = useSession();
  const [quick, setQuick] = useState<QuickLoginAccount[]>([]);
  useEffect(() => {
    // The server lists these only in its local mock-SMS demo mode.
    if (!__DEV__) return;
    api<{ accounts: QuickLoginAccount[] }>('/api/mobile/auth')
      .then(result => setQuick(result.accounts))
      .catch(() => undefined);
  }, []);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sentTo, setSentTo] = useState('');
  useEffect(() => {
    if (!animations) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 560, useNativeDriver: true }).start();
  }, [animations, enter]);
  useEffect(() => {
    if (!animations || !busy) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animations, busy, pulse]);
  useEffect(() => {
    if (!challenge) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge]);
  const seconds = challenge ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000)) : 0;
  const expired = Boolean(challenge && now >= challenge.expiresAt);
  const text = { color: C.muted } as const;
  const input = {
    minHeight: size.button,
    borderRadius: radius.small,
    borderColor: C.line,
    borderWidth: 1,
    backgroundColor: C.card,
    color: C.text,
    padding: space.md,
    fontSize: textRoles.section.fontSize,
  } as const;
  async function request(target = indianMobilePhone(phone)) {
    if (!target) return;
    const result = await requestOtp(target);
    if (result) {
      setSentTo(target);
      setChallenge(result);
      setCode('');
      setNow(Date.now());
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: space.xl, paddingTop: 40, gap: space.md }}
        >
          <Animated.View
            style={{
              gap: space.md,
              opacity: enter,
              transform: [
                {
                  translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                },
              ],
            }}
          >
          <Animated.View style={{ opacity: pulse }}>
            <BrandMark size={88} />
          </Animated.View>
          <Heading
            eyebrow="Qram"
            title={challenge ? 'Your code. Your next step.' : 'A better day starts here.'}
            copy={
              challenge
                ? `Enter the ${challenge.otpLength ?? 6}-digit code for ${sentTo}.`
                : 'Sign in or get started with your phone number. No password to remember.'
            }
          />
          {!challenge ? (
            <>
              <Text variant="subhead" style={text}>Mobile number</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
                <View
                  accessibilityLabel="India country code, plus 91"
                  style={[input, { justifyContent: 'center' }]}
                >
                  <Text variant="section" style={{ color: C.text }}>+91</Text>
                </View>
                <TextInput
                  accessibilityLabel="10-digit Indian mobile number"
                  value={phone}
                  onChangeText={value => {
                    setPhone(indianMobileInput(value));
                    setError('');
                  }}
                  placeholder="98765 43210"
                  placeholderTextColor={C.muted}
                  keyboardType="number-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel-national"
                  editable={!busy}
                  style={[input, { flex: 1, minWidth: 0 }]}
                />
              </View>
              <Text variant="subhead" style={text}>Enter your 10-digit Indian mobile number.</Text>
              <Button
                title={busy ? 'Requesting code…' : 'Get code'}
                disabled={busy || !indianMobilePhone(phone)}
                onPress={() => void request()}
              />
              {quick.length > 0 && (
                <Card>
                  <Text variant="headline" style={{ color: C.text }}>
                    Simulated accounts
                  </Text>
                  <Text variant="subhead" style={text}>
                    Local demo only. Tap to sign in without a code. They already publish, follow,
                    upvote and repost each other.
                  </Text>
                  {quick.map((account, index) => (
                    <Button
                      key={account.number}
                      title={`${account.number} · ${account.name}`}
                      secondary
                      onPress={() => void quickLogin(index + 1)}
                      disabled={busy}
                    />
                  ))}
                </Card>
              )}
              {__DEV__ && process.env.EXPO_PUBLIC_DEMO_MODE === 'true' && (
                <Card>
                  <Text variant="headline" style={{ color: C.text }}>
                    Local test accounts
                  </Text>
                  <Text variant="subhead" style={text}>
                    Development shortcuts only. These fictional accounts do not receive SMS.
                  </Text>
                  {mockPhoneAccounts.map(account => (
                    <Button
                      key={account.phone}
                      title={`Test as ${account.label}`}
                      secondary
                      onPress={() => {
                        setError('');
                        void request(account.phone);
                      }}
                      disabled={busy}
                    />
                  ))}
                </Card>
              )}
            </>
          ) : (
            <>
              {challenge.mockCode && (
                <Card>
                  <Text variant="headline" style={{ color: C.text }}>
                    Mock SMS · nothing was sent
                  </Text>
                  <Text variant="subhead" style={text}>Use this test code:</Text>
                  <Text
                    selectable
                    variant="display"
                    style={{ color: C.lime, letterSpacing: 6 }}
                  >
                    {challenge.mockCode}
                  </Text>
                  <Text variant="subhead" style={text}>
                    For local testing only. This does not verify ownership of a real phone number.
                  </Text>
                </Card>
              )}
              <Text variant="subhead" style={text}>Verification code</Text>
              <OtpCodeInput
                length={challenge.otpLength ?? 6}
                key={challenge.challengeId}
                value={code}
                onChange={setCode}
                disabled={busy || expired}
              />
              <Text accessibilityLiveRegion="polite" variant="subhead" style={text}>
                {expired
                  ? 'This code has expired. Request a new one.'
                  : 'Code expires after 5 minutes. Each code can be used once.'}
              </Text>
              <Button
                title={busy ? 'Checking…' : 'Verify & continue'}
                disabled={busy || code.length !== (challenge.otpLength ?? 6) || expired}
                onPress={() => void verifyOtp(challenge.challengeId, code)}
              />
              <Button
                title={seconds ? `Resend code in ${seconds}s` : 'Resend code'}
                secondary
                disabled={busy || seconds > 0}
                onPress={() => void request(sentTo)}
              />
              <Button
                title="Change phone number"
                secondary
                disabled={busy}
                onPress={() => {
                  setChallenge(null);
                  setCode('');
                  setError('');
                }}
              />
            </>
          )}
          {error ? (
            <Text
              accessibilityRole="alert"
              variant="subhead"
              style={{ color: C.danger }}
            >
              {error}
            </Text>
          ) : null}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
