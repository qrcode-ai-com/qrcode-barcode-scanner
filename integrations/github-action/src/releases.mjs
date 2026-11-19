// SPDX-License-Identifier: MIT
// The qrscan releases this action installs without being told a checksum. Each value is copied
// from the release manifest of the engine repository (distribution/releases/vX.Y.Z.json), which
// records the published SHA256SUMS file and every archive. The staging program checks that this
// table still equals that manifest before it writes the action's repository.
export const REPOSITORY = 'qrcode-ai-com/qrcode-barcode-scanner-rust';
export const DEFAULT_VERSION = '0.11.0';

export const RELEASES = Object.freeze({
  '0.11.0': Object.freeze({
    tag: 'v0.11.0',
    sums: '1b3263cf6c29af99fbcf9cc3f82e32febc7e598638292685fcd57c0656cc911e',
    archives: Object.freeze({
      'aarch64-apple-darwin': Object.freeze({
        sha256: 'fed588c3073661f0a3400c91fdb4924a3ba02bc7142206a87b68056c3c7018d2',
        executable: '18ca8f9fd1cd9b0c1830bc47fced8d83e388eba0f3ed0cbc767e3edc313db68c',
      }),
      'aarch64-unknown-linux-gnu': Object.freeze({
        sha256: 'd5b5eff8ed336ef82a76865fd16e9a087afd5b1574b537747aea6d105ae7c5aa',
        executable: 'd010a03064011f8775fc6f0add357cbbc634366d4b96dc0b892ab2c6047b271a',
      }),
      'x86_64-apple-darwin': Object.freeze({
        sha256: 'a2e367340e7736b782da549acaf412a17f4acc1817500a97e70f70d0c2519d0d',
        executable: '01ceb5912ef8ea5c6ea4727c8d619a437209e996bd8e77ed82567d0fcfb68d26',
      }),
      'x86_64-pc-windows-msvc': Object.freeze({
        sha256: '6c8771c2d225abb7b4ce75f073a86aa118bf6537f6824706628b81584a81ede7',
        executable: '69381d512c72e0a5a2db8596e51a3d405eebd4f00a37a9e68faa2ed7b845531f',
      }),
      'x86_64-unknown-linux-gnu': Object.freeze({
        sha256: 'b7c6669e332c7cc688228077b70d87f52154052e345992bd358aad6d6c7d3298',
        executable: '77965589784699138d2b512f94067528eba552536160560daed191de824ea01c',
      }),
    }),
  }),
});
