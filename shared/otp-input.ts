export function otpDigits(value: string, length: 4 | 6 = 6) {
  return value.replace(/\D/g, '').slice(0, length);
}
