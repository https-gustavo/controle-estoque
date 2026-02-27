import { createHash, randomBytes } from 'crypto'

export function sha256Hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export function generateApiKey(bytes = 24) {
  return randomBytes(bytes).toString('hex')
}
