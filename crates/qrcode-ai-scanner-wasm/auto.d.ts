/** The package ships one portable module (no SIMD) for every supported engine. */
export type ScannerVariant = 'portable';
export type ScannerInitCode = 'invalid_options' | 'wasm_unavailable' | 'wasm_features_unsupported'
  | 'loader_import_failed' | 'asset_network_failed' | 'asset_http_failed'
  | 'asset_read_failed' | 'binary_invalid' | 'wasm_validation_failed' | 'wasm_compile_failed'
  | 'wasm_instantiate_failed';
export type LoadedScanner = typeof import('./qrcode-ai-scanner.js') & { readonly variant: ScannerVariant };
export interface ScannerLoaderOptions {
  /** 'compatible' is the pre-0.11 name of the same no-SIMD feature set; any other value is `invalid_options`. */
  variant?: 'auto' | 'portable' | 'compatible';
  wasmUrl?: string | URL;
}
export declare class ScannerInitError extends Error {
  readonly code: ScannerInitCode;
  readonly variant: ScannerVariant | null;
  readonly status?: number;
  readonly cause?: unknown;
  constructor(code: ScannerInitCode, variant: ScannerVariant | null, cause?: unknown, status?: number);
}
/** `simd` is diagnostic only: the portable module does not need it. */
export declare function scannerCapabilities(): { wasm: boolean; simd: boolean; baseline: boolean };
export declare function createScannerLoader(options?: ScannerLoaderOptions): () => Promise<LoadedScanner>;
export declare const loadScanner: () => Promise<LoadedScanner>;
