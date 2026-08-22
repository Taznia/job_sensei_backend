import crypto from 'node:crypto';

export function createOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}
