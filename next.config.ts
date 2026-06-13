import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // ヘッドレス Chromium 依存（v1.9 OG スクリーンショット）はバンドルせず
  // サーバ外部パッケージ扱いにする。これで /api/og 関数のバンドル肥大と
  // 広すぎる NFT トレースを避ける（@sparticuz/chromium のバイナリ展開も正しく動く）。
  serverExternalPackages: ['playwright-core', '@sparticuz/chromium'],
  // M-1: 基本セキュリティヘッダ（CSP は別途 UAT 付きで導入予定）。
  // クリックジャッキング（X-Frame-Options）と MIME スニッフィングを封鎖する。
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
};

export default nextConfig;
