# デンドリティック・メモリ・エディター - クイックスタート

**最短 5 分で起動!**

---

## 1️⃣ 初期セットアップ (3分)

```bash
# リポジトリクローン
git clone https://github.com/your-username/dendritic-memory-editor.git
cd dendritic-memory-editor

# 依存パッケージインストール
npm install
cd backend && npm install && cd ..
```

## 2️⃣ 起動コマンド (2分)

### 方法A: 2つのターミナル

**ターミナル 1 - フロントエンド:**
```bash
npm run dev
# http://localhost:5173
```

**ターミナル 2 - バックエンド:**
```bash
cd backend && npm start
# http://localhost:8787
```

### 方法B: 1つのターミナル (tmux)

```bash
# 自動で両方起動
tmux new-session -d -s dendritic && \
  tmux new-window -t dendritic -n frontend && \
  tmux send-keys -t dendritic:frontend "npm run dev" Enter && \
  tmux new-window -t dendritic -n backend && \
  tmux send-keys -t dendritic:backend "cd backend && npm start" Enter && \
  tmux attach -t dendritic
```

---

## ✅ 動作確認

```bash
# ブラウザでアクセス
# http://localhost:5173

# API テスト
curl http://localhost:8787/health
# {"status":"ok","timestamp":"2024-12-11T..."}

# GraphQL テスト
curl -X POST http://localhost:8787/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ hello }"}'
```

---

## 📁 プロジェクト構造

```
dendritic-memory-editor/
├── src/                    # フロントエンド (React + TypeScript)
│   ├── components/        # React コンポーネント
│   ├── hooks/            # カスタムフック
│   ├── pages/            # ページコンポーネント
│   └── App.tsx           # メインコンポーネント
├── backend/               # バックエンド (Hono + Wrangler)
│   ├── src/
│   │   ├── index.ts      # エントリーポイント
│   │   ├── routes/       # API ルート
│   │   ├── graphql/      # GraphQL スキーマ
│   │   ├── services/     # ビジネスロジック
│   │   ├── performance/  # パフォーマンス最適化
│   │   └── access-control/  # 認証・認可
│   └── wrangler.toml     # Wrangler 設定
├── package.json          # フロント依存パッケージ
├── STARTUP_GUIDE.md      # 詳細ガイド
└── PHASE_*.md           # 実装ドキュメント
```

---

## 🚀 デプロイ

### バックエンド (Cloudflare Workers)

```bash
cd backend
wrangler login
npm run deploy
# デプロイ URL: https://dendritic-memory-backend.nullai-db-app-face.workers.dev
```

### フロントエンド (GitHub Pages)

```bash
npm run build
# dist/ フォルダをホスティングサービスにアップロード
```

---

## 🔧 よく使うコマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | フロントエンド開発モード |
| `npm run build` | フロントエンドビルド |
| `npm run lint` | ESLint チェック |
| `cd backend && npm start` | バックエンド開発モード |
| `cd backend && npm run deploy` | バックエンドデプロイ |
| `wrangler tail` | バックエンドログ確認 |

---

## ⚙️ 環境変数

### フロントエンド (.env)

```
VITE_API_URL=http://localhost:8787
```

### バックエンド (backend/wrangler.toml)

```toml
[vars]
JWT_SECRET = "e58862cdb1ee26704a69c6af29bd8d3f3d38e95cf3b04c07c01182519024042f"
FRONTEND_URL = "https://dendritic-memory-editor.pages.dev"
```

---

## 🐛 トラブルシューティング (よくある問題)

### Port already in use

```bash
# 別のポートで起動
npm run dev -- --port 5174

# または既存プロセスを終了
lsof -i :5173
kill -9 <PID>
```

### Cannot find module

```bash
npm install --legacy-peer-deps
```

### Database connection failed

```bash
cd backend
wrangler login
wrangler d1 list
```

### CORS Error

バックエンド (src/index.ts) に以下を追加:

```typescript
app.use(async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');
  await next();
});
```

---

## 📚 ドキュメント参照

| ドキュメント | 内容 |
|-------------|------|
| [STARTUP_GUIDE.md](./STARTUP_GUIDE.md) | 詳細セットアップガイド |
| [PHASE_2B_IMPLEMENTATION.md](./PHASE_2B_IMPLEMENTATION.md) | フロントエンド実装 |
| [PHASE_2C_IMPLEMENTATION.md](./PHASE_2C_IMPLEMENTATION.md) | バックエンド実装 |
| [PHASE_3_IMPLEMENTATION.md](./PHASE_3_IMPLEMENTATION.md) | GraphQL API |
| [PHASE_5_IMPLEMENTATION.md](./PHASE_5_IMPLEMENTATION.md) | 協調編集システム |
| [PHASE_6_IMPLEMENTATION.md](./PHASE_6_IMPLEMENTATION.md) | 高度な検索 |
| [PHASE_7_IMPLEMENTATION.md](./PHASE_7_IMPLEMENTATION.md) | エンタープライズ機能 |
| [PHASE_8_IMPLEMENTATION.md](./PHASE_8_IMPLEMENTATION.md) | パフォーマンス最適化 |

---

## 💾 Git コマンド

```bash
# 状態確認
git status

# 変更をステージ
git add .

# コミット
git commit -m "feat: 機能名"

# プッシュ
git push origin main

# ブランチ作成
git checkout -b feature/feature-name
```

---

## 🔗 便利なリンク

- [API Endpoint](http://localhost:8787)
- [GraphQL Playground](http://localhost:8787/graphql)
- [Frontend](http://localhost:5173)
- [GitHub Repository](https://github.com/your-username/dendritic-memory-editor)

---

## 📞 サポート

問題が発生した場合:

1. [STARTUP_GUIDE.md](./STARTUP_GUIDE.md) のトラブルシューティングセクションを参照
2. GitHub Issues で詳細を報告
3. GitHub Discussions でコミュニティに相談

---

**Happy coding! 🚀**
