# Phase 5: 協調編集システム実装

**ステータス**: ✅ 完了
**日付**: 2024年12月
**バージョン**: 1.0

## 概要

Phase 5では、複数ユーザーがリアルタイムで同時に同じドキュメントを編集できる協調編集システムを実装します。Operational Transformation (OT) アルゴリズムを使用した競合解決、ロック機構、バージョン管理、コメント・メンション機能を含みます。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│         COLLABORATIVE EDITING SYSTEM                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Frontend                   │      Backend           │
│  ──────────────────────────────────────────────────  │
│  - CollaborativeEditor UI   │  - CollaborativeEditor │
│  - useCollaborativeEditor   │  - ConflictResolver    │
│  - Cursor tracking          │  - CollaborationServer │
│  - Live comments            │  - Socket.IO handlers  │
│  - Presence indicators      │  - OT engine           │
│                             │  - Lock management     │
│                                                      │
│  Real-time Data Flow:                                │
│  Client A ─[Operation]→ Server ─[Broadcast]→ Client B
│           ←─[Transform]─      ←─[Apply]─             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## コアコンポーネント

### 1. CollaborativeEditor エンジン (`backend/src/collaboration/collaborativeEditor.ts`)

**目的**: リアルタイム協調編集のコア実装

**主要インターフェース**:

```typescript
interface Operation {
  id: string
  clientId: string
  userId: string
  type: "insert" | "delete" | "update"
  path: string              // JSON パス (例: "content", "metadata.tags[0]")
  value?: any               // insert/update 用
  oldValue?: any            // 変更追跡用
  position?: number         // 文字列操作用
  length?: number           // delete 操作用
  timestamp: number
  revision: number          // 操作作成時のドキュメント版
  parentId?: string         // 依存関係追跡用
}

interface EditSession {
  id: string
  userId: string
  clientId: string
  documentId: string
  startTime: number
  lastActivity: number
  cursorPosition: number
  isActive: boolean
}

interface DocumentVersion {
  id: string
  documentId: string
  revision: number
  content: any
  operations: Operation[]
  createdAt: number
  createdBy: string
  hash: string
}
```

**主要メソッド**:
```typescript
createDocument(documentId, initialContent, userId): DocumentVersion
getDocument(documentId): DocumentVersion | undefined
applyOperation(documentId, operation): { success, error?, version? }
createSession(userId, clientId, documentId): EditSession
updateSessionCursor(clientId, cursorPosition): EditSession | undefined
endSession(clientId): boolean
getActiveSessions(documentId): EditSession[]
acquireLock(path, userId, duration): { success, error? }
releaseLock(path, userId): boolean
getOperationHistory(documentId, from, to): Operation[]
transformOperation(op, against): Operation
detectConflicts(version1, version2): boolean
mergeVersions(version1, version2): DocumentVersion
```

**特徴**:
- Operational Transformation (OT) 実装
- JSONパスベースの更新
- リアルタイムカーソル追跡
- セッション管理
- ロック機構
- バージョン管理
- 競合検出

### 2. 競合解決エンジン (`backend/src/collaboration/conflictResolution.ts`)

**目的**: 同時編集の競合を自動解決

**競合解決戦略**:

1. **Last-Write-Wins (LWW)**
   - 最新のタイムスタンプを持つバージョンを優先
   - シンプルで予測可能
   - 高速な解決が必要な場合に使用

2. **Three-Way Merge**
   - ベースバージョンとの比較で変更を検出
   - 両者が同じ変更をした場合は結合
   - 片方だけが変更した場合はその変更を採用
   - 両者が異なる変更をした場合は競合を報告

3. **パス優先度ベースマージ**
   - 特定パスに対して優先度を指定
   - 複雑な競合に対応

**主要メソッド**:
```typescript
detectConflicts(version1, version2): Conflict | null
resolveWithLWW(conflict): MergeResult
resolveWithThreeWayMerge(conflict, baseVersion): MergeResult
resolveWithCustomFunction(conflict, mergeFn): MergeResult
resolveByPathPriority(conflict, priorityMap): MergeResult
calculateMergeDiff(version1, version2): diff object
revertToVersion(targetVersion): DocumentVersion
```

**Conflict インターフェース**:
```typescript
interface Conflict {
  id: string
  documentId: string
  version1: DocumentVersion
  version2: DocumentVersion
  conflictingPaths: string[]
  timestamp: number
  resolved: boolean
  resolution?: DocumentVersion
}
```

### 3. CollaborationServer (`backend/src/collaboration/collaborationServer.ts`)

**目的**: WebSocketを通じた協調編集の管理

**Socket.IO イベント**:
```
クライアント → サーバー:
  - join-document: ドキュメント参加
  - operation: 操作適用
  - cursor-move: カーソル移動通知
  - request-lock: ロック要求
  - release-lock: ロック解放
  - add-comment: コメント追加
  - mention: ユーザーメンション
  - request-sync: 同期要求

サーバー → クライアント:
  - document-loaded: ドキュメント状態送信
  - operation-applied: 操作適用完了
  - operation-rejected: 操作拒否
  - cursor-updated: カーソル位置更新
  - presence-updated: プレゼンス更新
  - lock-changed: ロック状態変更
  - comment-added: コメント追加通知
  - mentioned: メンション通知
  - sync-response: 同期応答
```

**主要機能**:
- リアルタイムドキュメント同期
- 競合する操作の変換（OT）
- ユーザープレゼンス管理
- ロック機構
- コメント・メンション機能
- カーソル追跡

### 4. useCollaborativeEditor Hook (`src/hooks/useCollaborativeEditor.ts`)

**目的**: React コンポーネントで協調編集を簡単に使用

**主要機能**:
```typescript
// 状態
state: CollaborativeEditorState
content: any
revision: number
isLoading: boolean
error: string | null
cursors: Record<string, CursorInfo>
comments: Comment[]
presences: PresenceInfo[]

// 操作
applyOperation(operation): void
updateContent(path, value): void
insertValue(path, value, position): void
deleteValue(path, position, length): void

// カーソル & プレゼンス
updateCursor(position): void
getOtherUsers(): User[]

// ロック
requestLock(path): void
releaseLock(path): void
isPathLocked(path): boolean

// コメント & メンション
addComment(path, content, range): void
mentionUser(userId, message, commentId): void
getCommentsForPath(path): Comment[]

// 同期
requestSync(): void
```

### 5. CollaborativeEditor UI (`src/components/CollaborativeEditor.tsx`)

**機能**:
- リアルタイムドキュメント編集
- 複数ユーザーの同時表示
- ライブカーソル追跡
- ロック表示
- コメント追加・メンション
- プレゼンス表示（サイドバー）
- 変更自動保存

**UI構成**:
```
┌─────────────────────────────────────────────────────┐
│ ヘッダー (アクティブユーザー表示)                  │
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│  エディタ領域    │  右サイドバー                    │
│  - 編集可能フィ  │  - アクティブユーザー            │
│    ールド        │  - カーソル位置                  │
│  - コメント      │  - コメント一覧                  │
│  - ロック表示    │                                  │
│                  │                                  │
└──────────────────┴──────────────────────────────────┘
```

## データフロー

### 1. 操作適用フロー
```
ユーザーが編集
    ↓
applyOperation() 呼び出し
    ↓
他の並行操作に対して変換 (OT)
    ↓
ドキュメントに適用
    ↓
all clients に broadcast
```

### 2. 競合検出フロー
```
操作受信
    ↓
版番号チェック
    ↓
競合検出
    ↓
競合戦略で解決
    ↓
マージバージョン返却
```

### 3. ロック管理フロー
```
ロック要求
    ↓
既存ロック確認
    ↓
利用可能 → ロック取得
    ↓
ユーザーに確認
    ↓
解放時に削除
```

## API 例

### ドキュメント参加
```typescript
socket.emit("join-document", {
  documentId: "doc-123",
  userId: "user-456",
  userName: "John Doe"
});

socket.on("document-loaded", (data) => {
  console.log("Document content:", data.content);
  console.log("Current revision:", data.revision);
});
```

### 操作適用
```typescript
const { updateContent, insertValue, deleteValue } = useCollaborativeEditor(
  documentId,
  userId,
  userName
);

// コンテンツ更新
updateContent("topic", "新しいタイトル");

// 値挿入
insertValue("tags", "新しいタグ", 0);

// 値削除
deleteValue("content", 10, 5);
```

### ロック取得
```typescript
const { requestLock, releaseLock, isPathLocked } = useCollaborativeEditor(...);

if (isPathLocked("content")) {
  alert("This field is locked");
} else {
  requestLock("content");
  // ... edit ...
  releaseLock("content");
}
```

### コメント & メンション
```typescript
const { addComment, mentionUser } = useCollaborativeEditor(...);

// コメント追加
addComment(
  "content",
  "この部分は改善が必要ですか？",
  { start: 10, end: 20 }
);

// ユーザーメンション
mentionUser("user-789", "お疲れ様です", "comment-123");
```

## Operational Transformation (OT) アルゴリズム

### OT の基本概念

クライアント A と B が同時に同じドキュメントを編集する場合:

```
初期状態: "Hello"

クライアント A: 位置 5 に "!" 挿入
  → "Hello!"

クライアント B: 位置 3 に " World" 挿入
  → "Hel World"

OT 変換後:
- A の操作は "Hel World" に対して変換 → "Hel World!"
- B の操作は "Hello!" に対して変換 → "Hello World!"

最終結果 (一貫性保証): "Hello World!"
```

### 変換関数
```typescript
transformOperation(op: Operation, against: Operation[]): Operation {
  let transformed = { ...op };

  for (const otherOp of against) {
    if (otherOp.timestamp < transformed.timestamp) {
      // パス & 型に基づいて変換
      if (
        transformed.type === "insert" &&
        otherOp.type === "insert" &&
        transformed.path === otherOp.path
      ) {
        // 位置調整
        if (otherOp.position < transformed.position) {
          transformed.position += otherOp.value.length;
        }
      }
    }
  }

  return transformed;
}
```

## バージョン管理

### スナップショット作成
```typescript
const snapshot = createSnapshot(documentId, userId);
// 現在の状態を新しいバージョン ID で保存
```

### 履歴取得
```typescript
const operations = getOperationHistory(documentId, from, to);
// 特定範囲の操作を取得
```

### バージョンを巻き戻す
```typescript
const revertedVersion = revertToVersion(targetVersion);
// targetVersion の状態に戻す
```

## プレゼンス管理

### プレゼンス情報
```typescript
interface PresenceInfo {
  userId: string
  clientId: string
  userName: string
  status: "editing" | "viewing" | "idle"
  lastUpdate: number
  cursorPosition: number
}
```

### アクティブセッション取得
```typescript
const sessions = getActiveSessions(documentId);
// 30秒以内に活動があったセッションを返す
```

## ロック機構

### ロック取得
```typescript
const result = acquireLock(path, userId, duration);

if (result.success) {
  // ロック取得成功
} else {
  // 既に別ユーザーがロック中
  console.log(result.error);
}
```

### ロック期間
- デフォルト: 60秒
- カスタマイズ可能
- タイムアウト後は自動解放

## コメント & メンション

### コメント構造
```typescript
interface Comment {
  id: string
  path: string          // ドキュメントのどの部分か
  content: string
  author: string
  authorId: string
  timestamp: number
  resolved: boolean
  range?: { start, end }  // 文字列範囲
}
```

### メンション通知
```typescript
socket.on("mentioned", (data) => {
  console.log(`${data.mentionedBy} が您をメンションしました`);
  console.log(`メッセージ: ${data.message}`);
});
```

## パフォーマンス最適化

### 操作圧縮
- 短時間の複数操作を統合
- ネットワーク転送量削減

### 差分送信
```typescript
// フルドキュメント送信ではなく差分のみ
const diff = calculateMergeDiff(version1, version2);
socket.emit("partial-update", diff);
```

### メモリ管理
```typescript
// 古いセッションのクリーンアップ
const cleaned = cleanupOldSessions(30000); // 30秒タイムアウト
console.log(`${cleaned} old sessions cleaned`);
```

## ファイル一覧

### バックエンド
- `backend/src/collaboration/collaborativeEditor.ts` (~600 LOC)
- `backend/src/collaboration/conflictResolution.ts` (~500 LOC)
- `backend/src/collaboration/collaborationServer.ts` (~400 LOC)

### フロントエンド
- `src/hooks/useCollaborativeEditor.ts` (~350 LOC)
- `src/components/CollaborativeEditor.tsx` (~500 LOC)

**合計**: ~2,350 行のコード

## 統合例

### Hono サーバーセットアップ
```typescript
import { Server } from "socket.io";
import { initializeCollaborationServer } from "./collaboration/collaborationServer";

const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const collaborationServer = initializeCollaborationServer(io);
```

### React コンポーネント統合
```typescript
import CollaborativeEditor from "./components/CollaborativeEditor";

export default function DocumentPage() {
  return (
    <CollaborativeEditor
      documentId="doc-123"
      userId="user-456"
      userName="John Doe"
      onSave={(content) => {
        // サーバーに保存
      }}
    />
  );
}
```

## テスト戦略

### ユニットテスト
- OT 変換ロジック
- 競合検出
- ロック機構

### 統合テスト
- リアルタイム同期
- マルチユーザー編集
- 競合解決

### パフォーマンステスト
- 大規模ドキュメント編集
- 高頻度操作
- 多数ユーザーの同時接続

## 今後の拡張

1. **リッチテキスト編集**
   - 段落スタイル
   - フォーマット
   - リスト機能

2. **高度なマージ**
   - 3-way merge の改善
   - ヒューマンレビュー UI
   - マージ統計

3. **アクセス制御**
   - ドキュメント権限管理
   - 読取専用モード
   - フィールドレベル権限

4. **監査ログ**
   - 変更履歴の詳細記録
   - ユーザー追跡
   - 変更原因記録

5. **リアルタイム通知**
   - Slack/Teams 統合
   - メール通知
   - カスタムアラート

## トラブルシューティング

### 競合が頻繁に発生する
→ OT 変換ロジックを確認、或いは Three-Way Merge に変更

### ロックがタイムアウト
→ ロック期間を延長、或いはハートビート実装

### 遅延が大きい
→ WebSocket 接続確認、操作圧縮、差分送信実装

## 結論

Phase 5 は、複数ユーザーがリアルタイムで協力してドキュメントを編集できる完全な協調編集システムを提供します。Operational Transformation を用いた自動競合解決により、ユーザーは編集の競合について心配することなく、効率的に作業できます。
