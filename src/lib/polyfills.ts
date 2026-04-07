// This file patches Node.js globals that @solana/web3.js needs
// but are not available in the browser environment.
// It must be imported at the top of the root layout.

if (typeof window !== 'undefined') {
  // Buffer polyfill
  const { Buffer } = require('buffer')
  window.Buffer = window.Buffer ?? Buffer

  // process polyfill (minimal)
  // @ts-ignore
  window.process = window.process ?? { env: {}, browser: true, version: '' }
}
