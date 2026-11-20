// SPDX-License-Identifier: MIT
// esbuild's binary loader turns the engine's .wasm file into its bytes.
declare module '*.wasm' {
  const bytes: Uint8Array;
  export default bytes;
}
