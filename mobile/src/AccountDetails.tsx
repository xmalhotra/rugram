import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import type { MobilePayload } from '../../shared/mobile';
import { normalizeUsername, usernameProblem } from '../../shared/usernames';
import { Button } from './design/components';
import { Text } from './design/Text';
import { hit, radius, space, textRoles, useTheme } from './design/theme';

function usernameField(handle: string) {
  const value = handle.trim().toLowerCase().replace(/^@/, '');
  return value.startsWith('q_') ? value.slice(2) : value;
}

export function AccountDetails({
  data,
  busy,
  onSaveName,
  onSaveUsername,
  onRequestEmail,
  onVerifyEmail,
}: {
  data: MobilePayload;
  busy: boolean;
  onSaveName: (name: string) => Promise<boolean>;
  onSaveUsername: (username: string) => Promise<boolean>;
  onRequestEmail: (email: string) => Promise<{ challengeId: string; mockCode?: string } | null>;
  onVerifyEmail: (challengeId: string, code: string) => Promise<boolean>;
}) {
  const { colors: C } = useTheme();
  const [name, setName] = useState(data.user.name === 'New member' ? '' : data.user.name);
  const [part, setPart] = useState(usernameField(data.user.handle));
  useEffect(() => setPart(usernameField(data.user.handle)), [data.user.handle]);
  const proposed = normalizeUsername(part);
  const problem = usernameProblem(part);
  const usernameChanged = proposed !== data.user.handle.trim().toLowerCase();
  const [email, setEmail] = useState(data.user.email ?? '');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [mockCode, setMockCode] = useState('');
  const phone = data.user.phone ?? '';
  const verified = Boolean(data.user.email) && email.trim().toLowerCase() === data.user.email;

  async function sendCode() {
    const challenge = await onRequestEmail(email);
    if (!challenge) return;
    setChallengeId(challenge.challengeId);
    setMockCode(challenge.mockCode ?? '');
    setCode('');
  }

  return (
    <View style={{ gap: space.md }}>
      <Field label="Name">
        <TextInput
          accessibilityLabel="Member name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={C.muted}
          autoCapitalize="words"
          style={input(C)}
        />
        <Button
          title="Save name"
          variant="text"
          accessibilityLabel="Save name"
          disabled={busy || name.trim().length < 2}
          onPress={() => void onSaveName(name)}
        />
      </Field>
      <Field label="Username">
        <View
          style={{
            minHeight: hit,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: radius.small,
            backgroundColor: C.card,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text variant="callout" style={{ color: C.muted, paddingLeft: space.md }}>q_</Text>
          <TextInput
            accessibilityLabel="Username"
            value={part}
            onChangeText={value => setPart(value.replace(/\s/g, '').toLowerCase())}
            placeholder="yourname"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            style={{ flex: 1, minHeight: hit, paddingRight: space.md, color: C.text, fontSize: textRoles.callout.fontSize }}
          />
        </View>
        <Text variant="footnote" style={{ color: C.muted }}>
          Starts with q_. 4–18 letters, numbers or underscores. You can change it once every 30 days.
        </Text>
        {problem ? <Text variant="subhead" style={{ color: C.danger }}>{problem}</Text> : null}
        <Button
          title="Save"
          variant="text"
          accessibilityLabel="Save username"
          disabled={busy || Boolean(problem) || !usernameChanged}
          onPress={() => void onSaveUsername(proposed)}
        />
      </Field>
      <Field label="Mobile number">
        <TextInput
          accessibilityLabel="Mobile number"
          value={phone || 'Not available'}
          editable={false}
          style={[input(C), { color: C.muted }]}
        />
      </Field>
      <Field label="Mail ID">
        <TextInput
          accessibilityLabel="Mail ID"
          value={email}
          onChangeText={value => {
            setEmail(value);
            setChallengeId('');
            setMockCode('');
          }}
          placeholder="name@email.com"
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={input(C)}
        />
        {verified ? (
          <Text variant="subhead" style={{ color: C.muted }}>Verified</Text>
        ) : (
          <Button
            title="Send verification code"
            variant="text"
            accessibilityLabel="Send verification code"
            disabled={busy || !email.includes('@')}
            onPress={() => void sendCode()}
          />
        )}
        {challengeId ? (
          <View style={{ gap: space.sm }}>
            <Text variant="subhead" style={{ color: C.muted }}>
              Enter the 6-digit code sent to {email.trim()}.
            </Text>
            {mockCode ? (
              <Text variant="subhead" style={{ color: C.muted }}>
                Demo code {mockCode}. Email delivery is not configured on this server.
              </Text>
            ) : null}
            <TextInput
              accessibilityLabel="Email verification code"
              value={code}
              onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit code"
              placeholderTextColor={C.muted}
              style={input(C)}
            />
            <Button
              title="Verify mail ID"
              variant="text"
              accessibilityLabel="Verify mail ID"
              disabled={busy || code.length !== 6}
              onPress={() =>
                void onVerifyEmail(challengeId, code).then(ok => {
                  if (ok) {
                    setChallengeId('');
                    setCode('');
                    setMockCode('');
                  }
                })
              }
            />
          </View>
        ) : null}
      </Field>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="footnote" style={{ color: C.muted }}>{label}</Text>
      {children}
    </View>
  );
}

function input(C: { text: string; line: string; card: string }) {
  return {
    minHeight: hit,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: radius.small,
    paddingHorizontal: space.md,
    color: C.text,
    backgroundColor: C.card,
    fontSize: textRoles.callout.fontSize,
  };
}
