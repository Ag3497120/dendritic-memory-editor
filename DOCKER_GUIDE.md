# Docker セットアップガイド

Docker を使用してアプリケーションをコンテナ化し、任意の環境で簡単に起動できます。

---

## 📋 前提条件

| ツール | バージョン | インストール |
|--------|-----------|-------------|
| Docker | >= 20.10 | https://www.docker.com/products/docker-desktop |
| Docker Compose | >= 2.0 | Docker Desktop に付属 |

### インストール確認

```bash
docker --version
# Docker version 20.10.x

docker-compose --version
# Docker Compose version 2.x.x
```

---

## 🚀 クイックスタート (Docker Compose)

### 1. アプリケーション起動

```bash
# プロジェクトルートディレクトリから
docker-compose up

# バックグラウンド起動
docker-compose up -d

# ログ確認
docker-compose logs -f
```

### 2. アプリケーションアクセス

```
フロントエンド: http://localhost:5173
バックエンド:   http://localhost:8787
GraphQL:       http://localhost:8787/graphql
```

### 3. 停止・削除

```bash
# 停止
docker-compose down

# コンテナと全データ削除
docker-compose down -v
```

---

## 🔧 Docker コマンド詳細

### 起動パターン

```bash
# 全サービス起動 (foreground)
docker-compose up

# 全サービス起動 (background)
docker-compose up -d

# 特定サービスのみ起動
docker-compose up frontend
docker-compose up backend

# キャッシュなしでリビルド
docker-compose up --build --no-cache
```

### ログ確認

```bash
# 全サービスのログ
docker-compose logs

# 特定サービスのログ
docker-compose logs frontend
docker-compose logs backend

# リアルタイムログ (follow mode)
docker-compose logs -f

# 最新 100 行
docker-compose logs --tail=100

# タイムスタンプ付き
docker-compose logs --timestamps
```

### コンテナ管理

```bash
# 実行中のコンテナ確認
docker-compose ps

# コンテナ内でコマンド実行
docker-compose exec frontend npm run build
docker-compose exec backend npm start

# コンテナに接続
docker-compose exec frontend sh
docker-compose exec backend sh

# コンテナ再起動
docker-compose restart frontend
docker-compose restart backend

# コンテナ停止
docker-compose stop

# コンテナ削除
docker-compose rm
```

### ネットワーク・ボリューム

```bash
# ネットワーク確認
docker network ls
docker network inspect dendritic_dendritic-network

# ボリューム確認
docker volume ls
docker volume inspect dendritic_node_modules_frontend

# クリーンアップ
docker system prune -a
```

---

## 📝 カスタム設定

### 環境変数のカスタマイズ

`docker-compose.yml` の環境変数セクションを編集:

```yaml
services:
  frontend:
    environment:
      - VITE_API_URL=http://your-backend-url:8787
      - VITE_DEBUG=true

  backend:
    environment:
      - JWT_SECRET=your-secret-key
      - NODE_ENV=production
```

### ポートの変更

```yaml
services:
  frontend:
    ports:
      - "3000:5173"  # 外部:内部ポート

  backend:
    ports:
      - "9000:8787"
```

### ボリューム設定

ローカルファイル変更の反映:

```yaml
services:
  frontend:
    volumes:
      - .:/app           # アプリ全体をマウント
      - /app/node_modules  # node_modules は除外

  backend:
    volumes:
      - ./backend:/app
      - /app/node_modules
```

---

## 🛠️ 個別 Docker イメージビルド

### フロントエンドイメージ

```bash
# イメージビルド
docker build -f Dockerfile.frontend -t dendritic-frontend:latest .

# イメージ確認
docker images | grep dendritic-frontend

# コンテナ起動
docker run -p 5173:5173 \
  -e VITE_API_URL=http://localhost:8787 \
  dendritic-frontend:latest
```

### バックエンドイメージ

```bash
cd backend

# イメージビルド
docker build -t dendritic-backend:latest .

# イメージ確認
docker images | grep dendritic-backend

# コンテナ起動
docker run -p 8787:8787 \
  -e JWT_SECRET=your-secret \
  -e FRONTEND_URL=http://localhost:5173 \
  dendritic-backend:latest
```

---

## 🔍 トラブルシューティング

### コンテナが起動しない

```bash
# ログ確認
docker-compose logs frontend
docker-compose logs backend

# 詳細エラー確認
docker-compose up --no-detach

# コンテナの状態確認
docker-compose ps
```

### ポート既に使用中

```bash
# ポート確認
sudo lsof -i :5173
sudo lsof -i :8787

# ポート変更 (docker-compose.yml)
# ports:
#   - "5174:5173"  # 別のポート

# または既存プロセス終了
kill -9 <PID>
```

### メモリ不足

```bash
# Docker メモリ制限確認
docker stats

# docker-compose.yml に制限設定
services:
  frontend:
    mem_limit: 1g
    memswap_limit: 2g
```

### ボリューム権限エラー

```bash
# macOS の場合
# Preferences > Resources > File Sharing で
# プロジェクトディレクトリを共有フォルダに追加

# Linux の場合
sudo usermod -aG docker $USER
newgrp docker
```

### ネットワーク接続失敗

```bash
# ネットワーク確認
docker network ls
docker network inspect dendritic_dendritic-network

# ネットワーク再作成
docker-compose down
docker network prune
docker-compose up
```

---

## 📦 Dockerfile 詳細説明

### フロントエンド Dockerfile

```dockerfile
# マルチステージビルド
FROM node:18-alpine AS builder
  # ビルドステージ
  # npm install と npm run build を実行

FROM node:18-alpine
  # 本番ステージ
  # ビルド結果のみをコピー (node_modules は含まない)
```

**メリット**:
- イメージサイズが小さい
- 本番環境には必要なファイルのみ

### バックエンド Dockerfile

```dockerfile
FROM node:18-alpine
  # Node.js 18 Alpine (軽量)
  # npm install でのみ使用

WORKDIR /app
  # 作業ディレクトリ設定

COPY package*.json ./
  # package.json と package-lock.json をコピー

RUN npm ci
  # 依存パッケージインストール (package-lock.json から)

COPY . .
  # ソースコードをコピー

EXPOSE 8787
  # ポート宣言

HEALTHCHECK
  # ヘルスチェック設定 (自動再起動判定)

CMD ["npm", "start"]
  # 起動コマンド (Wrangler dev)
```

---

## 🌐 本番環境での Docker

### イメージサイズ最適化

```bash
# イメージサイズ確認
docker images dendritic-*

# 最適化前: 500MB
# マルチステージ後: 150MB
```

### Docker Hub へのプッシュ

```bash
# ログイン
docker login

# タグ付け
docker tag dendritic-frontend:latest your-username/dendritic-frontend:1.0.0
docker tag dendritic-backend:latest your-username/dendritic-backend:1.0.0

# プッシュ
docker push your-username/dendritic-frontend:1.0.0
docker push your-username/dendritic-backend:1.0.0
```

### Kubernetes デプロイ

```bash
# デプロイメント定義 (k8s-deployment.yml)
apiVersion: v1
kind: Service
metadata:
  name: dendritic-frontend
spec:
  ports:
    - port: 80
      targetPort: 5173
  selector:
    app: dendritic-frontend

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dendritic-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dendritic-frontend
  template:
    metadata:
      labels:
        app: dendritic-frontend
    spec:
      containers:
      - name: frontend
        image: your-username/dendritic-frontend:1.0.0
        ports:
        - containerPort: 5173
```

```bash
# Kubernetes に デプロイ
kubectl apply -f k8s-deployment.yml
```

---

## 🔐 セキュリティベストプラクティス

### 環境変数の管理

```bash
# .env.docker ファイル作成
JWT_SECRET=your-secret-key
DB_PASSWORD=your-db-password

# docker-compose.yml で読み込み
env_file:
  - .env.docker
```

### イメージスキャン

```bash
# 脆弱性スキャン
docker scan dendritic-frontend:latest
docker scan dendritic-backend:latest
```

### 非 root ユーザーで実行

```dockerfile
# Dockerfile に追加
RUN addgroup -g 1001 appuser && \
    adduser -D -u 1001 appuser

USER appuser
```

---

## 📊 Docker パフォーマンス最適化

### キャッシュレイヤー最適化

```dockerfile
# ❌ 非効率 (依存が変わると全てリビルド)
COPY . .
RUN npm install

# ✅ 効率的 (依存が同じならキャッシュ使用)
COPY package*.json ./
RUN npm install
COPY . .
```

### マルチステージビルドの活用

```dockerfile
# フロントエンドの場合
FROM node:18 AS builder
COPY . .
RUN npm install && npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

### レイヤーサイズ削減

```bash
# イメージレイヤー確認
docker history dendritic-frontend:latest

# 最適化済みイメージサイズ
docker images --no-trunc dendritic-*
```

---

## 📚 便利なスクリプト

### bash エイリアス

```bash
# ~/.bashrc または ~/.zshrc に追加

alias dkc="docker-compose"
alias dkc-up="docker-compose up -d"
alias dkc-down="docker-compose down"
alias dkc-logs="docker-compose logs -f"
alias dkc-ps="docker-compose ps"
alias dkc-build="docker-compose build"
alias dkc-restart="docker-compose restart"
alias dkc-clean="docker system prune -a --volumes"
```

### Make コマンド (Makefile)

```makefile
.PHONY: up down logs build clean test

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

build:
	docker-compose build

clean:
	docker system prune -a --volumes

test:
	docker-compose exec frontend npm run lint
	docker-compose exec backend npm run lint

shell-frontend:
	docker-compose exec frontend sh

shell-backend:
	docker-compose exec backend sh
```

使用:
```bash
make up
make logs
make down
make clean
```

---

## 🎯 よくあるシナリオ

### シナリオ1: ローカル開発

```bash
docker-compose up -d
npm run dev  # または docker-compose exec frontend npm run dev
```

### シナリオ2: 本番ビルドテスト

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

### シナリオ3: CI/CD パイプライン

```yaml
# GitHub Actions の例
name: Docker Build & Deploy
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build
        run: docker-compose build
      - name: Push
        run: |
          docker login -u ${{ secrets.DOCKER_USER }} -p ${{ secrets.DOCKER_PASS }}
          docker push your-username/dendritic-frontend:latest
          docker push your-username/dendritic-backend:latest
```

---

## 📖 参考リソース

- [Docker 公式ドキュメント](https://docs.docker.com)
- [Docker Compose リファレンス](https://docs.docker.com/compose/compose-file)
- [Best Practices for Docker](https://docs.docker.com/develop/dev-best-practices)
- [Dockerfile リファレンス](https://docs.docker.com/engine/reference/builder)

---

**Docker で簡単デプロイ! 🐳**
