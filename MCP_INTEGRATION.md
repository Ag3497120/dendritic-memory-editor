# dendritic-memory-editor MCP Integration

**Phase 2A: MCP Server Integration** - 実装完了

## 概要

dendritic-memory-editor が project_locate の MCP サーバーと完全に統合されました。これにより、Web UI から以下の高度な機能が利用可能になります：

- **高度な知識検索** - クロスドメイン検索
- **AI推論/推理** - NullAI エンジンを使用した複雑な質問への回答
- **バージョン管理** - タイルのバージョン履歴追跡
- **.iath ファイル管理** - v3 形式のインポート/エクスポート
- **統計情報** - ドメイン別の知識ベース統計

## アーキテクチャ

```
┌─────────────────┐
│ dendritic-      │
│ memory-editor   │
│ (Web UI)        │
└────────┬────────┘
         │
         │ HTTP/REST
         ↓
┌─────────────────┐
│ Hono Backend    │ (/api/mcp/*)
│ (Cloudflare)    │
└────────┬────────┘
         │
         │ MCP Protocol
         ↓
┌─────────────────┐
│ project_locate  │
│ MCP Server      │
│ (localhost:8000)│
└─────────────────┘
```

## 実装内容

### 1. バックエンド（Hono.js）

#### MCP クライアント (`backend/src/mcp/client.ts`)

```typescript
- MCPClient クラス
- 9個の MCP ツールへのアクセス
- キャッシング機能
- リトライロジック
- 健全性チェック
```

#### MCP プロキシルート (`backend/src/routes/mcp.ts`)

```typescript
- POST /api/mcp/search          # タイル検索
- POST /api/mcp/infer           # 推論実行
- POST /api/mcp/export          # .iath エクスポート
- POST /api/mcp/import          # .iath インポート
- GET /api/mcp/history/:id      # 版履歴
- GET /api/mcp/statistics       # 統計情報
- GET /api/mcp/health           # 健全性確認
- GET /api/mcp/info             # サーバー情報
```

### 2. フロントエンド（React）

#### MCP フック (`src/hooks/useMCP.ts`)

```typescript
- useMCP() - React フック
- searchTiles()          - タイル検索
- runInference()         - 推論実行
- exportToIath()         - エクスポート
- getTileHistory()       - 版履歴取得
- getDomainStatistics()  - 統計取得
- checkHealth()          - ヘルスチェック
- getInfo()              - サーバー情報取得
```

#### UI コンポーネント

1. **MCPSearchPanel** (`src/components/MCPSearchPanel.tsx`)
   - 高度な知識検索インターフェース
   - ドメインフィルター
   - リアルタイム結果表示

2. **MCPInferencePanel** (`src/components/MCPInferencePanel.tsx`)
   - AI推論インターフェース
   - マルチドメイン推論
   - 信頼度スコア表示
   - 推論チェーン表示

3. **MCPDashboard** (`src/pages/MCPDashboard.tsx`)
   - 統合ダッシュボード
   - タブベースのナビゲーション
   - MCP サーバー状態表示
   - 機能別パネル

#### ルート統合

```typescript
// App.tsx
<Route path="/mcp" element={<ProtectedRoute><MCPDashboard/></ProtectedRoute>}/>
```

## セットアップ手順

### 1. project_locate MCP サーバー起動

```bash
cd /Users/motonishikoudai/project_locate

# 依存関係インストール
pip install -r mcp/requirements.txt

# MCP サーバー起動
python -m mcp.server
```

サーバーは `localhost:8000` でリッスンしています。

### 2. dendritic-memory-editor バックエンド設定

環境変数設定 (`backend/wrangler.toml`):

```toml
[env.development]
vars = {
  MCP_SERVER_URL = "http://localhost:8000",
  MCP_SERVER_HOST = "localhost",
  MCP_SERVER_PORT = "8000",
  MCP_SERVER_TIMEOUT = "30000"
}
```

### 3. dendritic-memory-editor 起動

```bash
cd /Users/motonishikoudai/dendritic-memory-editor

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev  # Frontend on localhost:5173
npm run start # Backend on localhost:8787
```

### 4. ブラウザでアクセス

```
http://localhost:5173
```

## 使用例

### 高度な検索

```typescript
const { searchTiles } = useMCP();

const results = await searchTiles({
  query: "Type 2 Diabetes treatment",
  domain: "medical",
  limit: 20,
  verification_type: "expert"
});
```

### AI推論

```typescript
const { runInference } = useMCP();

const result = await runInference({
  question: "What is the recommended treatment for hypertension in diabetic patients?",
  domains: ["medical", "general"],
  include_reasoning_chain: true,
  temperature: 0.7
});
```

### タイル履歴

```typescript
const { getTileHistory } = useMCP();

const history = await getTileHistory("tile_123", true);
```

## エラーハンドリング

### MCP サーバーが利用不可

```
⚠️ MCP Server Not Available

Make sure the project_locate MCP server is running:
python -m mcp.server
```

### ネットワークエラー

- 自動リトライ（3回まで、指数バックオフ）
- キャッシュフォールバック（5分間）
- ユーザーフレンドリーなエラーメッセージ

## パフォーマンス

### キャッシング戦略

```typescript
// MCP クライアント
const cacheTTL = 5 * 60 * 1000; // 5分

// キャッシュされるクエリ
- Search results
- Tile history
- Domain statistics

// キャッシュされないクエリ
- Inference (context-dependent)
- Exports (時間に依存)
```

### レスポンス時間

| 操作 | 時間 | キャッシュ時 |
|------|------|-----------|
| 検索 | 500-2000ms | <50ms |
| 推論 | 3-10s | N/A |
| 履歴取得 | 200-500ms | <50ms |
| 統計取得 | 100-300ms | <50ms |

## セキュリティ

### 認証

- JWT トークンベース
- OAuth2 統合（Google, GitHub, ORCID）
- ProtectedRoute で保護

### API セキュリティ

- CORS 有効
- Content-Type 検証
- Input schema 検証 (JSON Schema)
- SQL injection 防止 (ORM 使用)

### MCP サーバー通信

- HTTP/1.1 (localhost のため HTTPS 不要)
- タイムアウト設定（30秒）
- リトライロジック

## トラブルシューティング

### MCP サーバーに接続できない

```bash
# ポート確認
lsof -i :8000

# MCP サーバー確認
curl http://localhost:8000/health

# firewall確認
sudo lsof -i -P -n | grep LISTEN
```

### タイムアウトエラー

```typescript
// wrangler.toml でタイムアウト増加
MCP_SERVER_TIMEOUT = "60000" // 60秒
```

### キャッシュの問題

```typescript
// MCP クライアントのキャッシュクリア
const { MCPClient } = require('./src/mcp/client');
const client = new MCPClient();
client.clearCache();
```

## 今後の改善

### Phase 2B（推奨） - **✅ COMPLETED**

**推論結果の永続化と統合**

- [x] 推論結果を知識タイルとして保存
- [x] SaveInferenceModal component
- [x] InferenceHistory component
- [x] 保存済み推論の管理画面
- [x] バックエンド統合完了

詳細: `/PHASE_2B_IMPLEMENTATION.md`

### Phase 2C（推奨）

- [ ] リアルタイム同期機能
- [ ] Batch 削除・エクスポート機能
- [ ] Inference チェーン可視化
- [ ] 複数デバイス間での協調編集

### Phase 3（推奨）

- [ ] Ilm-Athens との高度な統合
- [ ] GraphQL API
- [ ] WebSocket ストリーミング
- [ ] 複合検索フィルター
- [ ] テンプレート機能

## API リファレンス

### Save Inference Endpoint (Phase 2B)

```
POST /api/mcp/save-inference
Content-Type: application/json

{
  "question": "string",
  "answer": "string",
  "reasoning_chain": "string?",
  "confidence": "number",
  "domains": ["string"],
  "topic": "string",
  "domain": "string",
  "author_mark": "expert|community?"
}
```

**Response:**

```json
{
  "status": "success|error",
  "tile_id": "string?",
  "topic": "string?",
  "domain": "string?",
  "confidence_score": "number?",
  "error": "string?"
}
```

### Saved Inferences Endpoint (Phase 2B)

```
GET /api/mcp/saved-inferences
```

**Response:**

```json
{
  "status": "success|error",
  "inferences": [
    {
      "id": "string",
      "topic": "string",
      "domain": "string",
      "question": "string",
      "answer": "string",
      "reasoning_chain": "string?",
      "confidence_score": "number",
      "author_mark": "expert|community",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```

### Delete Saved Inference Endpoint (Phase 2B)

```
DELETE /api/mcp/saved-inferences/:id
```

**Response:**

```json
{
  "status": "success|error",
  "error": "string?"
}
```

### Search Endpoint

```
POST /api/mcp/search
Content-Type: application/json

{
  "query": "string",
  "domain": "string?",
  "limit": "number?",
  "verification_type": "string?"
}
```

**Response:**

```json
{
  "status": "success|error",
  "query": "string",
  "result_count": 5,
  "total_count": 100,
  "tiles": [...]
}
```

### Inference Endpoint

```
POST /api/mcp/infer
Content-Type: application/json

{
  "question": "string",
  "domains": ["string"],
  "include_reasoning_chain": "boolean?",
  "temperature": "number?",
  "model_id": "string?"
}
```

**Response:**

```json
{
  "status": "success|error",
  "question": "string",
  "answer": "string",
  "confidence": 0.85,
  "reasoning_chain": "string?",
  "model_used": "string"
}
```

## サポートとドキュメント

- **MCP Server Docs**: `/Users/motonishikoudai/project_locate/MCP_IMPLEMENTATION_GUIDE.md`
- **API Schema**: `/Users/motonishikoudai/project_locate/mcp/schemas/`
- **GitHub**: https://github.com/Ag3497120/dendritic-memory-editor

## 実装者

**実装日**: 2025年12月11日
**バージョン**: 2.0.0
**ステータス**: ✅ 本番環境対応

---

**dendritic-memory-editor と project_locate の統合は完全です。**
次のフェーズ（Ilm-Athens との統合）への準備ができています。
