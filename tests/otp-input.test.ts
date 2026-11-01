import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { otpDigits } from '../shared/otp-input';
test('OTP input supports pasted codes and bounds the value', () => {
  assert.equal(otpDigits('123 456'), '123456');
  assert.equal(otpDigits('ab12-34x56 78'), '123456');
  assert.equal(otpDigits('12'), '12');
  assert.equal(otpDigits(''), '');
  assert.equal(otpDigits('12 3456', 4), '1234');
});
test('one native autofill input powers the server-configured number of decorative boxes', () => {
  const source = readFileSync('mobile/src/OtpCodeInput.tsx', 'utf8');
  assert.match(source, /Array.from\(\{ length \}/);
  assert.match(source, /textContentType="oneTimeCode"/);
  assert.match(source, /autoComplete="sms-otp"/);
  assert.match(source, /accessibilityLabel=\{`\$\{length\}-digit verification code`\}/);
  assert.match(
    readFileSync('mobile/src/PhoneSignIn.tsx', 'utf8'),
    /EXPO_PUBLIC_DEMO_MODE === 'true'/,
  );
});
