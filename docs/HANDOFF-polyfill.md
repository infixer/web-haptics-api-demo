# 移設用プロンプト（別セッション向け）

`infixer/polyfill-web-haptics-api` をスコープにした**新しいセッション**を作り、以下をそのまま貼ってください。

> **セッション作成時のお願い:** リポジトリを 2 つ選べる UI なら、
> `infixer/polyfill-web-haptics-api`（push 先）に加えて
> `infixer/web-haptics-api-demo`（コピー元）も追加しておいてください。
> 1 つしか選べない場合は前者を選んでください。プロンプト側で代替手順に分岐します。

---

## ここから下をコピーして貼る

```
このリポジトリ infixer/polyfill-web-haptics-api を、npm パッケージとして公開できる状態に
セットアップしてほしい。中身は既に別リポジトリで完成しているので、それを移設する作業です。

## ゴール

infixer/web-haptics-api-demo の main ブランチにある packages/polyfill-web-haptics-api/ の中身を、
このリポジトリの**ルート直下**に移して、ビルドが通る状態で main に push する。

パッケージ概要: Web Haptics API (WICG proposal, https://github.com/WICG/web-haptics) の
navigator.playHaptics を副作用 import 1 行で生やすポリフィル。

## Step 1: ソースを取得する

infixer/web-haptics-api-demo は **private** です。次の順で試してください。

1. add_repo ツールがあれば `owner=infixer, repo=web-haptics-api-demo, access=read` で呼び、
   指示された clone コマンドを実行する
2. add_repo が無い、または権限エラーになる場合は、**そこで止まって私に報告してください。**
   その場合は私がローカルから直接 subtree push するので、この作業は不要になります。
   （推測でコードを書き起こそうとしないでください。実装が変わってしまいます）

取得できたら packages/polyfill-web-haptics-api/ 配下だけを使います。

## Step 2: ファイルを配置する

web-haptics-api-demo の packages/polyfill-web-haptics-api/ にある**この 19 ファイル**を、
このリポジトリのルート直下に、同じ相対パスで配置してください。

  LICENSE
  README.md
  package.json
  tsconfig.json
  tsup.config.ts
  src/activation.ts
  src/css.ts
  src/debug.ts
  src/effects.ts
  src/index.ts
  src/install.ts
  src/manual.ts
  src/pwm.ts
  src/types.ts
  src/backends/gamepad.ts
  src/backends/iosSwitch.ts
  src/backends/simulator.ts
  src/backends/types.ts
  src/backends/vibrate.ts

**内容は 1 文字も変えないでください。** リファクタも整形も不要です。
package.json の repository.url は既にこのリポジトリを指しているので修正不要です。

## Step 3: 単独リポジトリとして足りないものを足す

元は monorepo の一部だったので、以下がありません。追加してください。

1. **.gitignore** — 元は親リポジトリのものに依存していました。作成してください:

   node_modules/
   dist/
   *.tgz
   .DS_Store
   *.log

2. **package.json に publishConfig** — スコープ付きパッケージは npm 既定で private 扱いに
   なるため、公開するなら以下を追加:

   "publishConfig": { "access": "public" }

3. **GitHub Actions** (.github/workflows/ci.yml) — push と PR で
   `pnpm install --frozen-lockfile && pnpm typecheck && pnpm build` を回すだけの最小構成。
   Node は 22 を使ってください。

## Step 4: 検証する

必ず実行して、すべて通ることを確認してください。

  pnpm install
  pnpm typecheck     # tsc --noEmit / エラー 0 であること
  pnpm build         # tsup / ESM+CJS+d.ts が dist/ に出ること

そのうえで**パッケージの契約**を確認してください。ここが壊れていると利用側が動きません。

- exports が 4 つある: "." / "./manual" / "./debug" / "./css"
- 各 export に types / import / require の 3 つが揃っていて、
  dist/ に対応する .js / .cjs / .d.ts が実在する
- "sideEffects" が ["./dist/index.js", "./dist/index.cjs"] になっている
  （index だけが副作用エントリ。ここが壊れるとバンドラに消される）
- "files" が ["dist", "README.md", "LICENSE"] になっている
- `pnpm pack --dry-run` の出力に src/ や node_modules が混入していない

最後に、実際に import できるかを確認してください:

  node -e "import('./dist/index.js').then(()=>console.log('esm ok'))"
  node -e "require('./dist/index.cjs'); console.log('cjs ok')"

（Node には navigator が無いので、ポリフィルは何もせず静かに終わるのが正しい挙動です。
  例外が飛ばなければ OK）

## Step 5: commit して push

- ブランチは main
- dist/ と node_modules/ は絶対にコミットしない（Step 3 の .gitignore で除外されるはず）
- コミットメッセージは日本語で、何を移設したのか分かるように

## やらないこと

- 実装の変更・リファクタ・「改善」
- README の書き換え（制約や既知の落とし穴を意図的に書いてあります）
- npm publish（公開は私が判断します。Step 4 の pnpm pack --dry-run までで止めてください）
- ソースが取得できないときに、記憶や推測でコードを書き起こすこと

## 補足: このパッケージの設計意図

レビュー時に「バグに見えるが意図的」なものが 3 つあります。壊さないでください。

1. navigator.playHaptics は**常に undefined を返す**。仕様どおりです。成功可否を返すのは
   フィンガープリンティング経路になるため、提案が意図的に禁じています
2. 不正なエフェクト名で**throw しない**。throw すると API の存在と検証内容が漏れます
3. 診断機能 (getDiagnostics / setBackend) が /debug に隔離されている。これらは標準 API に
   存在しないので、ネイティブ実装向けのコードに混入しないよう分離してあります
```

---

## 参考: 移設が終わったあとに web-haptics-api-demo 側でやること

`apps/web/package.json` の依存を差し替える（今は pnpm workspace のリンクで解決している）:

```jsonc
"@infixer/polyfill-web-haptics-api": "github:infixer/polyfill-web-haptics-api"
// npm 公開後は "^0.1.0"
```

`packages/polyfill-web-haptics-api/` を web-haptics-api-demo に残したままなら workspace リンクが
効き続けるので、当面は今のままでも動きます。
