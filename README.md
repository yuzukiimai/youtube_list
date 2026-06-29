# YouTube Watch Tracker

好きな YouTube チャンネルを登録して、**全動画を一覧化**し、**視聴済み / 中断（途中まで）/ 未視聴**を管理できる個人用 Web アプリです。アプリ内の埋め込みプレイヤーで再生すると、視聴位置が自動保存されます。

> 1 人で使う前提（認証なし）の、PC 向けアプリです。

## 主な機能

- **チャンネル登録**：名前で検索、または URL・`@ハンドル`・チャンネルID・動画URL のいずれでも追加
- **視聴管理**：視聴済み / 中断 / 未視聴 の 3 状態。埋め込みプレイヤーで再生すると進捗を自動保存（5 秒ごと）
- **絞り込み・並び替え**：状態フィルター、キーワード検索、ショート / 横動画フィルター、新着・古い順・長さ順ソート
- **ショート判定**：再生時間（3 分以下）または `#shorts` タグで自動分類
- **自動更新**：チャンネルページを開くと新着動画を自動取得
- **チャンネル削除**：登録解除（視聴履歴ごと削除）

## 技術スタック

| 領域 | 使用技術 |
|---|---|
| フレームワーク | Next.js 16（App Router）/ React 19 |
| 言語 | TypeScript |
| DB / ORM | SQLite + Prisma 7（将来 PostgreSQL に移行予定） |
| スタイル | Tailwind CSS v4 |
| テスト | Vitest + Testing Library |
| 外部 API | YouTube Data API v3 / YouTube IFrame Player API |

## セットアップ

### 1. 前提

- Node.js **20 以上**
- YouTube Data API v3 の API キー（取得方法は後述）

### 2. クローンと依存インストール

```bash
git clone https://github.com/yuzukiimai/youtube_list.git
cd youtube_list
npm install   # postinstall で prisma generate も自動実行されます
```

### 3. 環境変数の設定

プロジェクト直下に `.env.local` を作成します（このファイルは Git 管理外です）。

```bash
# .env.local
YOUTUBE_API_KEY=あなたのAPIキー
DATABASE_URL=file:./prisma/dev.db
```

### 4. データベースの初期化

既存のマイグレーションを適用して SQLite データベース（`prisma/dev.db`）を作成します。

```bash
npx prisma migrate deploy
```

### 5. 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開けば利用開始できます。

## YouTube API キーの取得方法

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「API とサービス」→「ライブラリ」で **YouTube Data API v3** を有効化
3. 「認証情報」→「認証情報を作成」→「API キー」でキーを発行
4. 発行したキーを `.env.local` の `YOUTUBE_API_KEY` に設定

> **API クォータについて**：無料枠は 1 日 10,000 ユニットです。名前検索（`search.list`）は 1 回 100 ユニットと高め、URL/ハンドルでの追加や動画一覧取得は 1〜数ユニットです。個人利用ならまず上限には達しません。

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動（http://localhost:3000） |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動（要 build） |
| `npm run lint` | ESLint |
| `npm run test` | テスト（watch モード） |
| `npm run test:run` | テスト 1 回実行 |

## ディレクトリ構成

```
app/
  api/            # ルートハンドラ（チャンネル登録/検索/同期/削除、進捗・視聴状態の更新）
  channels/[channelId]/  # チャンネルページ（動画一覧＋プレイヤー）
  page.tsx        # ホーム（登録チャンネル一覧 + 追加フォーム）
components/        # UI コンポーネント（VideoCard, VideoFilter, YoutubePlayer など）
lib/              # YouTube API ラッパー、ステータス判定など
prisma/           # schema.prisma とマイグレーション
```

## 仕様・制限

- **単一ユーザー / 認証なし**：1 人で使う前提です。
- **ショート判定は推定**：API に公式フラグが無いため「3 分以下 または `#shorts` タグ」で判定します。一部誤判定の可能性があります。
- **視聴履歴の同期は不可**：通常の YouTube で観た履歴はこのアプリには反映されません（YouTube が視聴履歴 API を提供していないため）。アプリ内のプレイヤーで観たぶんだけ記録されます。

## 今後の予定（Roadmap）

- [ ] データベースを PostgreSQL（Amazon RDS）へ移行
- [ ] AWS へのデプロイ
- [ ] AWS Cognito による認証（複数ユーザー対応）

### PostgreSQL へ移行する場合（参考）

`prisma/schema.prisma` の `datasource` を `postgresql` に変更し、`.env.local` の `DATABASE_URL` を接続文字列に差し替えます。

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
```
