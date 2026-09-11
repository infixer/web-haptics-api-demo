# web-haptics-api-demo

[Web Haptics API](https://github.com/WICG/web-haptics)（提案中）の体験デモと、そのポリフィル。

勉強会の 10 分 LT 用。**触覚ノッチ付きスライダー**と**触覚あてゲーム**を 1 ページに載せ、
`navigator.playHaptics()` を実際に触れる形にしてあります。

> リポジトリ名は当初のモールス案の名残です。中身は Web Haptics API のデモに変わっています。
> モールス案の分析は [docs/DESIGN.md](docs/DESIGN.md) に背景資料として残してあります。

## 構成

```
.
├── apps/web/                          SvelteKit アプリ（フロントエンドのみ）
└── packages/polyfill-web-haptics-api/ navigator.playHaptics のポリフィル
```

ポリフィルは **[infixer/polyfill-web-haptics-api](https://github.com/infixer/polyfill-web-haptics-api)
へ切り出す前提**の独立パッケージです。移設手順は [切り出し方](#ポリフィルを別リポジトリへ切り出す) を参照。

## スマホで実際に試す（2026-09-11 更新）

**`/lab`** にAndroidのリズム振動とiPhoneの直接タップ式switchデモを追加しました。
Androidは `navigator.vibrate()`、iOSは本物のswitchを指で操作する経路です。
iOSの合成クリックや任意の自動パターンは利用できる前提にしません。
画面はAndroid／iOSのタブと操作だけに絞っています。検証フォーム・JSON保存・合成クリック比較は削除しました。
LTの流れは [アウトライン](docs/LT-OUTLINE.md) にまとめています。

[一次情報を含む再調査と実機テスト手順](docs/RESEARCH-mobile-haptics-2026-09.md)。
最新版のスマホ実機での振動は未検証です。

## デモの中身

| | |
|---|---|
| **触覚ノッチ付きスライダー** | API が想定する使い方。`tick`（ノッチ）/ `align`（中央スナップ）/ `edge`（端）を命令的に、`hint`（ホバー）を CSS の宣言だけで鳴らす |
| **触覚あてゲーム** | 4 エフェクトの組み合わせで作った 6 パターンを、感触だけで見分ける。神経衰弱モードとあてゲームモード |
| **セットアップ** | 「感じましたか？」と聞くキャリブレーション。API が対応可否を返さない以上、これが唯一の確実な判定 |
| **モニタ** | 呼ばれた `playHaptics()` を棒グラフで可視化。触覚の無い登壇 PC でも会場に見せられる |

## 開発

```sh
pnpm install
pnpm dev        # ポリフィルをビルドしてから vite dev
```

ポリフィルを触りながら開発するなら、別ターミナルで watch を回す:

```sh
pnpm dev:polyfill
```

```sh
pnpm check      # 型チェック（ポリフィル + svelte-check）
pnpm build
pnpm preview
```

### 実機テストはHTTPSの通常タブを推奨

スマホではHTTPSのURLを開いてください。開発サーバーをトンネルで公開する例:

```sh
pnpm dlx cloudflared tunnel --url http://localhost:5173
```

以前の「Vibration APIはsecure context専用なのでHTTPでは必ず鳴らない」という説明は
断言しすぎでした。現行ChromiumのIDLにはその指定がありません。実際にはAPIの有無、
前景表示、ユーザー操作、端末設定を確認してください。iframeでの制約も避けるため、
スライド等に埋め込まず通常タブで試します。詳細は再調査文書を参照。

## デプロイ（Cloudflare Workers）

`@sveltejs/adapter-cloudflare` で静的アセットとして配信します。サーバー処理はありません。

```sh
pnpm dlx wrangler login
pnpm run deploy   # pnpm deploy は組み込みコマンドなので run が必要
```

Worker 名は `apps/web/wrangler.jsonc` の `name`（既定 `web-haptics-api-demo`）で変えられます。

## ポリフィルを別リポジトリへ切り出す

`packages/polyfill-web-haptics-api/` はそのまま独立リポジトリになります。

```sh
# 履歴ごと切り出す場合
git subtree split --prefix=packages/polyfill-web-haptics-api -b polyfill-only
git push https://github.com/infixer/polyfill-web-haptics-api.git polyfill-only:main

# 中身だけでよい場合
cp -r packages/polyfill-web-haptics-api/{src,package.json,tsconfig.json,tsup.config.ts,README.md,LICENSE} \
      ../polyfill-web-haptics-api/
```

切り出したあとは `apps/web/package.json` の依存を差し替えます:

```jsonc
"@infixer/polyfill-web-haptics-api": "^0.1.0"          // npm 公開後
// または
"@infixer/polyfill-web-haptics-api": "github:infixer/polyfill-web-haptics-api"
```

## ドキュメント

| | |
|---|---|
| [docs/DESIGN.md](docs/DESIGN.md) | 設計と、調べて分かった API の実態 |
| [docs/FINDINGS-ios-switch.md](docs/FINDINGS-ios-switch.md) | iOS switch ハックの実機検証ログと一次情報調査 |
| [docs/IDEAS.md](docs/IDEAS.md) | 他のアプリ案 |
| [packages/polyfill-web-haptics-api/README.md](packages/polyfill-web-haptics-api/README.md) | ポリフィルの仕様・フォールバック・制約 |

## 参考

- [WICG/web-haptics](https://github.com/WICG/web-haptics) — 提案本体
- [WICG/proposals#262](https://github.com/WICG/proposals/issues/262) — 2026-01-30 起票
- [MSEdgeExplainers / Haptics explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/Haptics/explainer.md)
- [mdn/browser-compat-data#29166](https://github.com/mdn/browser-compat-data/issues/29166) — 「iOS で vibrate が動く」誤報の顛末
- [lochie/web-haptics](https://github.com/lochie/web-haptics) — PWM と iOS switch ハックの先行実装
