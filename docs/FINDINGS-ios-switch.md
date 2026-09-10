# 検証ログ: iOS の switch ハックは合成クリックでは動かない

> **2026-09-10 訂正:** 以下は当時の検証記録です。直接タップと合成クリックの実機結果は有効ですが、「公開コード・バグ報告が存在しない」は誤りでした。呼び出し元の `state.trusted` 判定とWebKit #309082の公開修正が見つかりました。switch属性からOSバージョン・触覚対応も確定できません。最新の結論と実用デモは [再調査](RESEARCH-mobile-haptics-2026-09.md) と `/lab` を参照してください。

**検証日:** 2026-09-09
**結論:** `label.click()` による switch ハックは iOS 実機で触覚を出さない。配置・タイミングを
変えても解決しない。LT 台本（`docs/TALK.md`、本調査を受けて削除。git 履歴に残る）のネタ2 と
`backends/iosSwitch.ts` は**前提が誤っていた**。

---

## 発端

Cloudflare Workers にデプロイしたデモ（`web-haptics-api-demo`）を iPhone SE / Safari で開き、
触覚あてゲームを操作しても何も振動しなかった。

`playHaptics()` のモニタ（棒グラフ）は反応していたが、これは判定材料にならない。
`apps/web/src/lib/haptics.svelte.ts:79-84` は呼び出しの成否と無関係に記録するため:

```js
play(effect, intensity = 1) {
  navigator.playHaptics?.(effect, intensity);   // 何も返さない
  const entry = { id: nextId++, effect, intensity, at: performance.now() };
  this.recent = ...                              // 無条件で記録
}
```

Web Haptics API は成否を返さない（フィンガープリンティング対策）ので、呼び出し側から
成功を観測する手段は原理的に存在しない。

## 前提条件の確認

アプリ内「触覚のセットアップ」カード（`apps/web/src/lib/components/Setup.svelte:58-68`）の
診断表示:

| 項目 | 値 | 意味 |
|---|---|---|
| 使用中 | `iOS switch ハック` | `install.ts:75` の no-op ルートは通っていない |
| 利用可能 | `iOS switch ハック / シミュレータ（音）` | `"switch" in input` が true = **iOS 17.4+ 確定** |
| user activation | `あり` | `hasStickyActivation()` のガードも通過 |

よって `iosSwitch.ts:63` の `label.click()` は**確実に実行されていた**。
polyfill 側のロジックに欠陥はない。

## 対照実験

`/probe` ルート（`apps/web/src/routes/probe/+page.svelte`）を作成し、実機で4条件を比較した。

| | 条件 | 結果 |
|---|---|---|
| **A** | 可視スイッチを**指で直接**タップ（スクリプト経路なし） | **鳴る** |
| **B** | 現行 `iosSwitch.ts` と同一（オフスクリーン + `opacity:0`、`<body>`） | 鳴らない |
| **C** | `document.head` + `display:none`（ios-haptics パッケージの方式） | 鳴らない |
| **D** | 可視スイッチを `label.click()` でプログラム的にトグル | 鳴らない |
| **D'** | **D と同一の要素**を指で直接タップ | **鳴る** |

### D と D' が決定打

同一の DOM 要素に対して「指＝鳴る / 合成クリック＝鳴らない」が分かれた。これにより
以下がすべて対照条件として排除される:

- **配置** — 同じ要素、同じ位置
- **可視性・レンダリング** — 画面内に見えている状態で鳴らなかった
- **user activation** — ボタンのタップは本物の操作であり、合成クリックはそのハンドラ内で同期的に発火
- **端末設定** — A が鳴った時点で「システムの触覚」は ON と確定

残る差は**イベントが trusted か synthetic か**のみ。

## 影響

### 1. LT 台本「ネタ2: iOS で触覚を出す唯一の方法」の記述が誤り

```js
label.click();   // ← iOS 17.4+ でこれが本物の触覚になる
```

実機で否定された。台本の transport 一覧にあった「`<input switch>` を click → iOS Safari 17.4+」、
および `docs/DESIGN.md` のハック2・TickTrainTransport の記述も同様（DESIGN 側は訂正済み）。

皮肉として記録しておく価値がある: `docs/DESIGN.md:36` は MDN BCD
[#29166](https://github.com/mdn/browser-compat-data/issues/29166) の「iOS で `vibrate` が動く」
報告を「switch ハックの誤認」として正しく退けているが、**同じ誤認を自前のバックエンドで
踏んでいた**。

### 2. probe が構造的に嘘をつく

`iosSwitch.ts:53` の判定は属性の有無しか見ていない:

```js
return "switch" in probeInput;
```

「switch コントロールが存在するか」は分かるが、「触覚が実際に出るか」は**観測不可能**。
probe を修正して解決できる種類の問題ではない。結果として `使用中: iOS switch ハック` と
表示しながら何も起きず、自動フォールバックも働かない。

### 3. 設計自体は正しかった

`Setup.svelte:52` の「何も感じない」→ `useSimulator(true)` という「ユーザーに聞く」
フォールバックは、まさにこの状況のために用意されたもの。
`docs/DESIGN.md:33`「特徴検出は当てにならない」「§6.3 のユーザーに聞く設計の根拠がより強くなった」
という主張が、自分のコードで実証された形になった。**LT の主題としてはむしろ強い材料。**

## 対応方針

**推奨: `iosSwitch.ts` を `install.ts:26` のラダーから外す。**
probe が true を返す限り、iOS ユーザーは常に「動くはずのバックエンド」に当たって無反応になる。
外せば候補ゼロ → no-op となり、セットアップの「何も感じない」からシミュレータへ落ちる導線が
素直に働く。ソースは削除せずコメントで経緯を残す。

**唯一残る iOS の道: 合成イベントを使わない。**
実スイッチを UI 要素に透明オーバーレイし、**ユーザーの指のタップそのもの**でトグルさせれば
触覚は出る。直接タップする要素（触覚あてゲームのカード等）には適用可能。
ただしスライダーのドラッグ中の `tick` は指がスイッチを跨がないため**原理的に不可能**で、
`hint`（ホバー）/ `align`（スナップ）も同様。

## 一次情報の調査（2026-09-09）

実機結果の裏付けを WebKit の Bugzilla・コミット・ソースに当たって確認した。
**結論から言うと、この挙動を説明する WebKit のバグ報告もリリースノートも存在しない。**
以下は経緯の時系列。

### 1. iOS 18.0 — switch の触覚が搭載された

[WebKit Features in Safari 18.0](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/) /
[News from WWDC24](https://webkit.org/blog/15443/news-from-wwdc24-webkit-in-safari-18-beta/):

> WebKit for Safari on iOS 18 adds haptic feedback for `<input type=checkbox switch>`.

**重要な訂正:** 本リポジトリの LT 台本と `DESIGN.md` は一貫して「iOS 17.4+」と書いていたが、
17.4 で入ったのは **`switch` 属性そのもの**であり、**触覚は iOS 18.0 から**。両者は別のリリース。

対応する WebKit バグは
[#271711 "Allow for `<input type=checkbox switch>` haptic feedback on click"](https://bugs.webkit.org/show_bug.cgi?id=271711)
（Anne van Kesteren、2024-03-26 報告・FIXED、[PR #26468](https://github.com/WebKit/WebKit/pull/26468)、
276727@main）。**click 経由の触覚を明示的に許可したのはこのコミット**で、`label.click()` ハックは
仕様の隙間ではなく、当時は正規に通る経路だった。

### 2. 2025-01-03 — user activation が必須化（第1の締め付け）

[#285120 "Haptic feedback for `<input type=checkbox switch>` should require user activation"](https://bugs.webkit.org/show_bug.cgi?id=285120)
（報告者 petamoriken、2024-12-23 / 修正 Aditya Keerthi、[PR #38473](https://github.com/WebKit/WebKit/pull/38473)、
288403@main `dfb3971`、rdar://142190653）。コミットログ:

> It should not be possible to generate haptic feedback from script alone.
> Check that a user gesture is being processed if the haptic feedback is triggered due to a click.

`Source/WebCore/html/CheckboxInputType.cpp` に入ったガードが以下（**現在の main も同じ**）:

```cpp
void CheckboxInputType::performSwitchVisuallyOnAnimation(SwitchTrigger trigger)
{
    performSwitchAnimation(SwitchAnimationType::VisuallyOn);

    if (!RenderTheme::singleton().hasSwitchHapticFeedback(trigger))
        return;

    if (trigger == SwitchTrigger::Click && !UserGestureIndicator::processingUserGesture())
        return;

    if (RefPtr page = element()->document().page())
        page->chrome().client().performSwitchHapticFeedback();
}
```

注意: **これは我々の症状を説明しない。** `/probe` の B/C/D はいずれもボタンのタップという
本物のジェスチャのハンドラ内で同期的に `label.click()` を呼んでいるので、
`processingUserGesture()` は true になり、このガードは通過するはず。

### 3. オープンソースの WebKit には、現在の挙動を説明するコードが無い

main ブランチを直接確認した結果:

| 場所 | 内容 |
|---|---|
| `rendering/ios/RenderThemeIOS.h` | `hasSwitchHapticFeedback(SwitchTrigger) const final { return true; }` — **iOS は全 trigger で true**。Click も許可 |
| `rendering/mac/RenderThemeMac.h` | `{ return trigger == SwitchTrigger::PointerTracking; }` — Mac のみ制限 |
| `rendering/RenderTheme.h` | 既定は `false` |
| `UIProcess/ios/PageClientImplIOS.mm` | `UIImpactFeedbackGenerator` に `UIImpactFeedbackStyleLight` で `impactOccurred` を呼ぶだけ。追加のガード無し |

つまり**公開されている WebKit のコードは、user activation さえあれば合成クリックでも触覚を出す
建て付けのまま**。実機の挙動と食い違う。締め付けは非公開部分か、main に反映されていない
リリースブランチ側で行われたと考えるのが自然。

### 4. 第三者による同一報告（iOS 26.5）

- [m1ckc3s/project-fathom](https://github.com/m1ckc3s/project-fathom) — 実機 iOS 26.5 で検証:
  > as of iOS 26.5, only a **direct tap** fires the haptic — it can't be triggered from script anymore.
- [tijnjh/ios-haptics#8 "Can't Believe Apple 'Patched' This"](https://github.com/tijnjh/ios-haptics/issues/8)
  （2026-06-04 報告 / 2026-06-25 クローズ）— 利用者からの報告。
  > Was this even in their release notes?

Safari 26.5 のリリースノートにも WebKit のリリースノートにも該当記述は見つからなかった。
**Apple はこの変更を告知していない。**

### この調査から言えること

我々の `/probe` の結果は、**バグ報告として一次情報が存在しない、未告知の挙動変更を実機で
再現したもの**。第三者2件と独立に一致しており、信頼できる。LT のネタとしては
「ハックが動かなかった」より強い話になる。

### 5. 参考ライブラリ web-haptics (lochie) も同一端末で鳴らない

`docs/DESIGN.md:6` が参考ライブラリとして挙げている
[web-haptics (lochie)](https://haptics.lochie.me/) を同じ iPhone で試したところ、**振動しなかった**。

配信バンドル `assets/index-D7SgrCVF.js` を読むと、技法は本リポジトリの `iosSwitch.ts` と同一:

```js
// ensureDOM()
let l = document.createElement("input");
l.type = "checkbox", l.setAttribute("switch", ""), l.id = r,
l.style.all = "initial", l.style.appearance = "auto",
this.showSwitch || (s.style.display = "none", l.style.display = "none"),
s.appendChild(l), document.body.appendChild(s)

// trigger()
this.hapticLabel.click()
```

`all:initial` + `appearance:auto` という細部まで `iosSwitch.ts:33` と一致しており、
**本リポジトリの iOS バックエンドがこのライブラリを写したもの**であることが確認できる。
つまり不具合は自作コードで作り込んだものではなく、**参照元から継承したもの**。

判定は `Je.isSupported = typeof navigator.vibrate === "function"` で行っており、
iOS では false になるため switch ハックの枝に入る。バンドル内の `AudioContext` は
`this.debug` が真のときだけ鳴らすデバッグ音で、触覚の実現手段ではない。

**この結果の意味:** `/probe` の B/C/D に続く**4例目の独立した失敗**であり、しかも
`DESIGN.md` の設計が土台にしていた実装そのものが現在動作しない。
`docs/DESIGN.md:92-107`「1.3 web-haptics (lochie) が実際にやっていること」の記述は、
**技法の説明としては正確だが、現行 iOS では結果が得られない**という注記が必要。

---

---

## 対応方針の更新: オーバーレイ方式には先行実装がある

「実スイッチを透明オーバーレイして指のタップ自体でトグルさせる」案は、すでに2つの実装がある。

**project-fathom の要点** — ヒットテストのクリップに注意が必要:
`overflow: hidden` + `border-radius` は**描画しかクリップせず、ヒットテストはクリップしない**ため、
`clip-path: inset(0 round 999px)` を使う。

**tijnjh 版（Svelte）** — 本アプリと同じスタック。
[gist](https://gist.github.com/tijnjh/c95b30b44076d7447ed4dcecaeec6605):

```svelte
<span class="absolute inset-0 overflow-hidden rounded-full">
  <input type="checkbox" aria-label={label} switch onchange={onclick} />
</span>

<style>
  input {
    position: absolute;
    left: 50%; top: 50%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
    transform: translate(-50%, -50%) scale(6);
    transform-origin: center;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
</style>
```

### ⚠️ 未解決の副作用: スクロールが壊れる

[tijnjh/ios-haptics#11 "haptics breaks iOS scroll"](https://github.com/tijnjh/ios-haptics/issues/11)
（2026-08-31、**OPEN**）:

> If I go to scroll and initial press is on the buttons with haptics enabled, scroll is broken.
> It's currently unusable in its current state.

拡大した透明 input がタッチを奪うため、その上から始めたスクロールが効かなくなる。
**本アプリの触覚スライダーはドラッグ操作そのものなので、この副作用を最も踏みやすい。**
採用するならゲームのカード（単発タップ）に限定するのが安全。

## 未確定事項

- **どの iOS バージョンでこの挙動が塞がれたか。** 第三者報告は iOS 26.5 を指しており、
  時期（2026年6月）も一致するが、検証端末の UA を未取得のため本件では未確定。
  `/probe` に UA 表示があるので控えること
- **iPhone SE の世代。** iOS 17.4+ であることは probe から確定しているので第2世代以降だが、
  正確な世代とバージョンは未記録
- 他機種（iPhone 15/16 等、iOS 26）で同じ結果になるか未検証

## 再現手順

```sh
pnpm run deploy
# iPhone で https://web-haptics-api-demo.<subdomain>.workers.dev/probe を開き
# A → B → C → D の順にタップし、振動したものを記録する
```

`/probe` は診断用の使い捨てルート。結論をドキュメントに反映したら削除してよい。

---

## 付随して見つかった問題: Android 側の PWM が一度も実行されない

iOS の結論（アプリから鳴らせるのは Android だけ）を受けて `pwm.ts` を確認したところ、
別の不整合が見つかった。**未修正。実機検証が必要。**

`renderPulse()` が本物の PWM（20ms フレームのデューティ比）に入る条件は
`durationMs >= FRAME_MS * 2`、つまり **40ms 以上**。しかし `effects.ts` の4プロファイルは
すべて 40ms 未満なので、**PWM のループには一度も到達しない**。全てパルス幅スケーリングの枝に落ちる。

| effect | 定義 | `intensity=1` の実出力 |
|---|---|---|
| `hint` | 10ms / 0.3 | **5ms** |
| `tick` | 12ms / 0.6 | **9ms** |
| `align` | 15ms / 1.0 | **15ms** |
| `edge` | 35ms / 0.9 | **33ms** |

### 影響

1. **`docs/DESIGN.md:97`（ハック1: PWM による擬似 intensity）は、現行プロファイルでは
   到達しないコードの説明になっている。** LT の「ネタ1: 強さは PWM で作る」も同様。
   コード自体は正しく、呼ばれていないだけ。
2. **5ms / 9ms / 15ms は実機で潰れる可能性が高い。** Android の振動モーター（特に ERM）は
   起動に 20〜30ms かかるため、回り切る前に停止する。`hint` / `tick` / `align` が
   区別できないなら、**iOS で潰れるのと同じ問題が Android でも起きる**ことになり、
   `DESIGN.md:149`（神経衰弱をリズムで作った理由）の前提が変わる。

### 未検証

Android 実機を未入手のため、上記2は**机上の推論にとどまる**。
実機で4エフェクトを弁別できるか確認し、潰れるようなら `effects.ts` の `durationMs` を
40ms 以上に引き上げる（PWM が有効になり、強度差も出せるようになる）ことを検討する。

---

## 神経衰弱: 6 パターン中 2 つが衝突する（Android でも残る問題）

`patterns.ts:22-26` の設計意図は明示されている:

> They are separated mostly by *count and rhythm*, not by which effect is used.
> That is deliberate: on iOS the switch backend collapses `hint`, `tick` and
> `align` into one identical tap.

**つまりこのゲームは「振動の種類を当てる」遊びではなく「回数とリズムを聞き分ける」遊び。**
iOS で種類が潰れることを見越した設計だったが、守るべき失敗モードを一つ手前で読み違えていた
（潰れる以前に、そもそも鳴らない）。

`renderPulse()` を通した Android での実出力:

| id | 構成 | 実出力 |
|---|---|---|
| `tap` | tick ×1 | 7ms |
| `double` | tick ×2 | 7, 7（130ms 間隔） |
| `triple` | tick ×3 | 7, 7, 7（105ms 間隔） |
| `thud` | edge ×1 | 33ms |
| `knock` | edge ×2 | 33, 33（240ms 間隔） |
| `swell` | hint→tick→align | 4, 7, 15（95ms 間隔） |

**`triple` と `swell` は「約 100ms 間隔の 3 連打」で、リズムが実質同一。**
両者を分けるのは強度勾配（4→7→15ms）だけだが、これは ERM モーターの起動時間に埋もれる
帯域なので、実機では区別できない可能性が高い。`swell` は種類依存の唯一のパターンでもあり、
**リズムで分ける方針から外れているのはこの 1 つだけ**という点でも設計上の例外になっている。

### 参考: web-haptics のプリセットは桁が違う

同ライブラリ v0.0.6 のプリセット（11 種）:

| preset | pattern |
|---|---|
| `selection` | 8ms @0.3 |
| `rigid` | 10ms @1 |
| `light` | 15ms @0.4 |
| `medium` | 25ms @0.7 |
| `heavy` | 35ms @1 |
| `soft` | 40ms @0.5 |
| `success` | 30@0.5 → (60) 40@1 |
| `warning` | 40@0.8 → (100) 40@0.6 |
| `error` | 40@0.7 → (40) 40@0.7 → (40) 40@0.9 → (40) 50@0.6 |
| `nudge` | 80@0.8 → (80) 50@0.3 |
| `buzz` | 1000ms @1 |

8〜1000ms と幅が広く、**過半が 40ms 以上なので PWM が実際に効く**。
本リポジトリの 4〜33ms とは弁別しやすさが根本的に違う。
`effects.ts` の `durationMs` を 40ms 以上に引き上げる案の裏付けになる。

なお同ライブラリの PWM フレームも 20ms（`Q4=20`）、tick 間隔も `16 + (1-intensity)*184` で、
`DESIGN.md` の解析は数値まで正確だったことが確認できた。
