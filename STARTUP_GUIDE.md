# Dendritic Memory Editor - スタートアップガイド

**最終更新**: 2024年12月11日
**バージョン**: 1.0

包括的な起動手順とトラブルシューティングガイド

## 📋 目次

1. [前提条件](#前提条件)
2. [初期セットアップ](#初期セットアップ)
3. [フロントエンド起動](#フロントエンド起動)
4. [バックエンド起動](#バックエンド起動)
5. [統合起動](#統合起動)
6. [動作確認](#動作確認)
7. [トラブルシューティング](#トラブルシューティング)
8. [本番環境デプロイ](#本番環境デプロイ)

---

## 前提条件

### 必須ツール

| ツール | バージョン | インストール方法 |
|--------|-----------|------------------|
| Node.js | >= 18.x | https://nodejs.org |
| npm | >= 9.x | Node.jsに付属 |
| Wrangler | >= 4.x | `npm install -g wrangler` |
| Git | >= 2.x | https://git-scm.com |

### 推奨環境

- **OS**: macOS, Linux, Windows (WSL2)
- **メモリ**: 8GB 以上
- **ディスク**: 5GB の空き容量
- **IDE**: VS Code (推奨) + TypeScript 拡張機能

### システム確認コマンド

```bash
# Node.js バージョン確認
node --version        # v18.0.0 以上であることを確認
npm --version         # v9.0.0 以上であることを確認

# Git バージョン確認
git --version

# Wrangler インストール確認
wrangler --version
```

---

## 初期セットアップ

### 1. リポジトリのクローン

```bash
# リポジトリをクローン
git clone https://github.com/your-username/dendritic-memory-editor.git
cd dendritic-memory-editor

# リポジトリ状態確認
git status
```

### 2. 依存パッケージのインストール

```bash
# ルートディレクトリでフロントエンド依存パッケージをインストール
npm install

# バックエンド依存パッケージをインストール
cd backend
npm install

# ルートに戻る
cd ..
```

**インストール所要時間**: 約 3-5 分（インターネット速度に依存）

### 3. 環境変数の設定

#### フロントエンド設定

```bash
# .env ファイルが既に存在することを確認
cat .env

# 内容 (必要に応じて編集):
# VITE_API_URL=https://dendritic-memory-backend.nullai-db-app-face.workers.dev
```

**注**: フロントエンドの API URL は自動的に設定されています。ローカル開発の場合は以下に変更してください:

```bash
# .env をテキストエディタで開く
VITE_API_URL=http://localhost:8787
```

#### バックエンド設定

```bash
# wrangler.toml は既に設定されています
cd backend
cat wrangler.toml

# 内容確認:
# - JWT_SECRET: 認証キー
# - DATABASE_ID: Cloudflare D1 データベースID
# - OAuth 認証情報
```

**重要**: 本番環境では `.toml` ファイルの秘密情報を環境変数に移す必要があります

---

## フロントエンド起動

### 開発モード起動

```bash
# ルートディレクトリから
npm run dev

# 出力例:
# VITE v5.2.0  ready in 234 ms
#
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

### ブラウザでアクセス

```
http://localhost:5173
```

### スクリーンショット確認

アプリケーションが正常に起動した場合、以下の画面が表示されます:

1. **ホームページ** - ロゴとナビゲーション
2. **ダッシュボード** - タイル表示
3. **検索機能** - 高度な検索パネル
4. **エディタ** - 協調編集エリア

### フロントエンドビルド

```bash
# 本番用ビルド
npm run build

# 出力ディレクトリ: dist/
# ファイルサイズ確認
ls -lh dist/assets/

# ローカルでビルド版をプレビュー
npm run preview
```

---

## バックエンド起動

### 開発モード起動

```bash
cd backend

# Wrangler dev モードで起動
npm start
# または
wrangler dev

# 出力例:
# ⛅ wrangler (version 4.51.0)
# ▲ [wrangler:inf] To publish your Worker to Cloudflare, use 'wrangler publish'
# ▲ [wrangler:inf] You can use 'wrangler dev' to try your Worker locally.
#
# ✔ Listening on http://localhost:8787
```

### GraphQL エンドポイント確認

```bash
# GraphQL Playground にアクセス
curl http://localhost:8787/graphql

# またはブラウザで
http://localhost:8787/graphql
```

### API エンドポイント確認

```bash
# ヘルスチェック
curl http://localhost:8787/health

# 応答例:
# {"status":"ok","timestamp":"2024-12-11T..."}
```

### バックエンドビルド

```bash
cd backend

# 本番用ビルド
npm run build

# 本番環境へデプロイ
npm run deploy
```

---

## 統合起動

### 方法1: 2つのターミナルを使用 (推奨)

**ターミナル 1 - フロントエンド**

```bash
# ルートディレクトリから
npm run dev

# アウトプット:
# ➜  Local:   http://localhost:5173/
```

**ターミナル 2 - バックエンド**

```bash
cd backend
npm start

# アウトプット:
# ✔ Listening on http://localhost:8787
```

### 方法2: スクリーンマルチプレクサ (tmux/screen)

```bash
# tmux セッション作成
tmux new-session -d -s dendritic

# フロントエンドウィンドウ
tmux new-window -t dendritic -n frontend
tmux send-keys -t dendritic:frontend "npm run dev" Enter

# バックエンドウィンドウ
tmux new-window -t dendritic -n backend
tmux send-keys -t dendritic:backend "cd backend && npm start" Enter

# セッション一覧表示
tmux list-sessions

# セッションアタッチ
tmux attach -t dendritic

# ウィンドウ切り替え (Ctrl-b + n)
```

### 方法3: Docker Compose (将来対応)

```bash
# docker-compose.yml が利用可能な場合
docker-compose up

# ログ確認
docker-compose logs -f

# 停止
docker-compose down
```

---

## 動作確認

### 1. フロントエンド確認

```bash
# ブラウザでアクセス
http://localhost:5173

# 以下の機能を確認:
# ✓ ナビゲーションバー表示
# ✓ ダッシュボード読み込み
# ✓ ロゴ・スタイリング正常表示
```

### 2. バックエンド確認

```bash
# ヘルスチェック
curl http://localhost:8787/health

# 応答例:
{
  "status": "ok",
  "timestamp": "2024-12-11T10:30:00.000Z"
}
```

### 3. GraphQL API テスト

```bash
# GraphQL クエリ実行
curl -X POST http://localhost:8787/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ hello }"
  }'

# 応答例:
{
  "data": {
    "hello": "Hello from GraphQL!"
  }
}
```

### 4. APIIntegration テスト

```bash
# タイル一覧取得
curl http://localhost:8787/api/tiles

# 推論一覧取得
curl http://localhost:8787/api/inferences
```

### 5. 認証テスト

```bash
# JWT トークン取得
curl -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 応答例:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "email": "test@example.com"
  }
}
```

### 6. キャッシング機能テスト

```bash
# キャッシュ有効性確認
curl -w "\nResponse time: %{time_total}s\n" \
  http://localhost:8787/api/tiles

# 2回目のリクエストで応答時間が減少することを確認
```

### 7. パフォーマンスメトリクス確認

```bash
# メトリクス取得
curl http://localhost:8787/metrics

# 応答例:
{
  "cacheHitRate": 85.5,
  "averageResponseTime": 125,
  "queriesPerSecond": 342,
  "activeConnections": 12
}
```

---

## トラブルシューティング

### フロントエンド関連

#### 症状: `Error: EACCES: permission denied`

**原因**: npm キャッシュ権限問題

**解決策**:

```bash
# npm キャッシュクリア
npm cache clean --force

# node_modules 削除と再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 症状: `Cannot find module '@vitejs/plugin-react'`

**原因**: 依存パッケージが不完全

**解決策**:

```bash
# キャッシュをクリアして再インストール
npm install --legacy-peer-deps
```

#### 症状: `Port 5173 is already in use`

**原因**: ポートが既に使用されている

**解決策**:

```bash
# 別のポートで起動
npm run dev -- --port 5174

# または既存プロセスを終了
lsof -i :5173        # プロセスID確認
kill -9 <PID>        # プロセス終了
```

#### 症状: `VITE_API_URL is undefined`

**原因**: 環境変数が読み込まれていない

**解決策**:

```bash
# .env ファイルを確認
cat .env

# VITE プレフィックスが必須
# 正: VITE_API_URL=http://localhost:8787
# 誤: API_URL=http://localhost:8787
```

#### 症状: CORS エラー

**原因**: バックエンド CORS 設定不足

**解決策**:

```bash
# バックエンド src/index.ts で CORS 許可を確認
# または以下を追加:

app.use(async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');
  await next();
});
```

### バックエンド関連

#### 症状: `Database connection failed`

**原因**: Cloudflare D1 認証エラー

**解決策**:

```bash
cd backend

# Wrangler ログイン
wrangler login

# データベース確認
wrangler d1 list

# wrangler.toml の database_id が正しいか確認
cat wrangler.toml | grep database_id
```

#### 症状: `Port 8787 is already in use`

**原因**: ポートが既に使用されている

**解決策**:

```bash
# 別のポートで起動
wrangler dev --port 8788

# または既存プロセスを終了
lsof -i :8787
kill -9 <PID>
```

#### 症状: `Worker startup timeout`

**原因**: 起動時間が長すぎる

**解決策**:

```bash
# wrangler.toml にタイムアウト設定を追加
# [env.development]
# vars = { ... }

# または キャッシュをクリア
wrangler tail --format pretty
```

#### 症状: `TypeScript compilation error`

**原因**: TypeScript 型エラー

**解決策**:

```bash
cd backend

# TypeScript チェック
npx tsc --noEmit

# エラー箇所を確認して修正
# または型定義をインストール
npm install --save-dev @types/node
```

#### 症状: `GraphQL schema error`

**原因**: GraphQL スキーマが無効

**解決策**:

```bash
# GraphQL スキーマを確認
curl http://localhost:8787/graphql -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# エラーが表示される場合は src/graphql/schema.ts を確認
```

### 一般的なシステムエラー

#### 症状: `Node.js version mismatch`

**原因**: Node.js バージョンが要件を満たしていない

**解決策**:

```bash
# Node.js バージョン確認
node --version

# nvm (Node Version Manager) で適切なバージョンをインストール
nvm install 18
nvm use 18
```

#### 症状: `npm ERR! code ERESOLVE`

**原因**: 依存パッケージのバージョン競合

**解決策**:

```bash
npm install --legacy-peer-deps
```

#### 症状: `Memory heap out of memory`

**原因**: Node.js ヒープメモリ不足

**解決策**:

```bash
# Node.js ヒープサイズを増やす
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## 本番環境デプロイ

### Cloudflare Workers へのデプロイ

#### 1. Wrangler ログイン

```bash
cd backend

# Cloudflare アカウントでログイン
wrangler login

# ブラウザで認可を行う
```

#### 2. 本番環境ビルド

```bash
# フロントエンドビルド
npm run build

# バックエンドビルド (Wrangler が自動で行う)
```

#### 3. バックエンドデプロイ

```bash
cd backend

# 本番環境へデプロイ
npm run deploy

# または
wrangler deploy

# 出力例:
# 🌍  Deployed to https://dendritic-memory-backend.nullai-db-app-face.workers.dev
```

#### 4. フロントエンドデプロイ

```bash
# GitHub Pages または Cloudflare Pages へのデプロイ
# (CI/CD パイプラインを使用)

# 手動デプロイの場合:
# 1. dist/ フォルダの内容を Web ホスティングにアップロード
# 2. または Git へプッシュして CI/CD を実行
```

### 環境変数設定

```bash
# Wrangler での環境変数管理
wrangler secret put JWT_SECRET
# プロンプトで値を入力

# または wrangler.toml で設定
[env.production]
vars = { JWT_SECRET = "..." }
```

### デプロイ後の確認

```bash
# 本番 URL でアクセス
https://dendritic-memory-backend.nullai-db-app-face.workers.dev/health

# ログを確認
wrangler tail --format pretty
```

---

## ローカル開発の最適な設定

### VS Code 推奨拡張機能

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "GraphQL.vscode-graphql",
    "Wrangler.wrangler",
    "vue.volar"
  ]
}
```

### VS Code settings.json

```json
{
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### 便利なコマンドエイリアス

```bash
# ~/.bashrc または ~/.zshrc に追加

# フロントエンド起動
alias dendritic-front="cd ~/dendritic-memory-editor && npm run dev"

# バックエンド起動
alias dendritic-back="cd ~/dendritic-memory-editor/backend && npm start"

# 両方起動 (tmux)
alias dendritic-dev="tmux new-session -d -s dendritic && \
  tmux new-window -t dendritic -n frontend && \
  tmux send-keys -t dendritic:frontend 'cd ~/dendritic-memory-editor && npm run dev' Enter && \
  tmux new-window -t dendritic -n backend && \
  tmux send-keys -t dendritic:backend 'cd ~/dendritic-memory-editor/backend && npm start' Enter && \
  tmux attach -t dendritic"

# ログを確認
alias dendritic-logs="wrangler tail --format pretty"
```

### デバッグモード

```bash
# Node.js デバッグモード
node --inspect-brk backend/src/index.ts

# VS Code デバッグ設定 (.vscode/launch.json)
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Wrangler Dev",
      "program": "${workspaceFolder}/backend/node_modules/.bin/wrangler",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

---

## クイックスタートチェックリスト

本番環境でのスムーズな起動を確認するチェックリスト:

- [ ] Node.js >= 18.x インストール済み
- [ ] npm >= 9.x インストール済み
- [ ] Wrangler >= 4.x インストール済み
- [ ] Git リポジトリクローン完了
- [ ] `npm install` 実行完了
- [ ] `cd backend && npm install` 実行完了
- [ ] `.env` ファイルが正しく設定
- [ ] `wrangler.toml` の database_id が正しい
- [ ] `npm run dev` でフロントエンド起動確認
- [ ] `cd backend && npm start` でバックエンド起動確認
- [ ] ブラウザで http://localhost:5173 にアクセス確認
- [ ] ブラウザで http://localhost:8787/health にアクセス確認
- [ ] GraphQL クエリが実行できることを確認
- [ ] 認証機能が動作することを確認

---

## サポート & リソース

### ドキュメント

- [フロントエンド実装ドキュメント](./PHASE_2B_IMPLEMENTATION.md)
- [バックエンド実装ドキュメント](./PHASE_2C_IMPLEMENTATION.md)
- [GraphQL API ドキュメント](./PHASE_3_IMPLEMENTATION.md)
- [リアルタイム同期](./PHASE_4_IMPLEMENTATION.md)
- [協調編集](./PHASE_5_IMPLEMENTATION.md)
- [高度な検索](./PHASE_6_IMPLEMENTATION.md)
- [エンタープライズ機能](./PHASE_7_IMPLEMENTATION.md)
- [パフォーマンス最適化](./PHASE_8_IMPLEMENTATION.md)

### 公式リソース

- [Hono フレームワーク](https://hono.dev)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
- [Cloudflare D1](https://developers.cloudflare.com/d1)
- [Vite](https://vitejs.dev)
- [React ドキュメント](https://react.dev)
- [TypeScript ドキュメント](https://www.typescriptlang.org)
- [GraphQL](https://graphql.org)

### 問い合わせ先

- GitHub Issues: [プロジェクトリポジトリ](https://github.com/your-username/dendritic-memory-editor/issues)
- ディスカッション: [GitHub Discussions](https://github.com/your-username/dendritic-memory-editor/discussions)

---

## バージョン履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|--------|
| 1.0 | 2024-12-11 | 初版作成 - Phase 1-8 実装完了 |

---

## ライセンス

このプロジェクトは [MIT License](./LICENSE) の下で公開されています。

---

**最後に**: このガイドで解決しない問題が発生した場合は、GitHub Issues で詳細を報告してください。Happy coding! 🚀
