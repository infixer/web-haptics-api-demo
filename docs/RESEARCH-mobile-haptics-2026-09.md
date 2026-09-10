# スマホのWeb触覚: 再調査と実用デモ

調査日: **2026-09-10**。対象リポジトリの基点: `92066c6`。

## 結論

**「スマホのWebブラウザから振動させる手段がない」は広すぎる結論。**

| 対象 | 現在使う手段 | 制約 |
|---|---|---|
| Android / Chrome | `navigator.vibrate(number または配列)` | 長さと休止時間。振幅・周波数は指定できない。端末設定やハードウェア次第で無振動 |
| iPhone / Safari・WebKit系ブラウザ | 本物の `input type=checkbox switch` を直接操作 | システムのクリック感。任意の時刻・強度・自動パターンを指定するAPIではない |
| iOS の `input.click()` / `label.click()` | 現行の実用経路として採用しない | 合成クリックの抜け道が修正されている |
| 提案中の `navigator.playHaptics()` | ブラウザ標準として利用できる前提を置かない | 本リポジトリのpolyfillとネイティブ実装を混同しない |

「最新版」は調査日時点の安定版を指す。Appleの一覧は **iOS 26.6.2（9月8日）**、Googleは **Android 17（6月16日公開）** を示す。AndroidはOSとブラウザを別々に記録する。今回、これら最新版のスマホ実機は操作していないため、**実機動作保証ではなく一次資料・ソース調査に基づく実装**である。iOS 27等のベータも検証済みとはしない。

- [Apple security releases](https://support.apple.com/en-us/100100)
- [Android 17 is here](https://android-developers.googleblog.com/2026/06/Android-17.html)
- [Chrome公式 Vibration API Sample](https://googlechrome.github.io/samples/vibration/)
- [WICG Web Haptics proposal](https://github.com/WICG/web-haptics)

## 既存ログはどこまで正しかったか

`FINDINGS-ios-switch.md` の **同一スイッチが指では鳴り、合成クリックでは鳴らなかった**という実験は有効。Androidは実機未検証なので、そこからAndroidの不可能性は導けない。直接タップは同ログで成功している。

一方、旧文書の「公開WebKitには挙動を説明するコードもバグ報告も存在しない」は訂正が必要。

### 公開ソースに trusted 判定がある

[CheckboxInputType.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CheckboxInputType.cpp) の `clickHandler` は、`state.trusted` を確認してからswitchのアニメーション・触覚経路に入る。旧調査は呼び出される側の `performSwitchVisuallyOnAnimation()` のuser gestureガードだけを見ていた。**その手前で合成クリックが除外される**ため、非公開実装を仮定する必要はない。

さらに [WebKit公開コミット 4a8a906](https://github.com/WebKit/WebKit/commit/4a8a90644cfc7a9a4b3cab13c4c0b49c53862787) は、関連labelをスクリプトでクリックするとuntrustedイベントがtrustedとして転送される問題を修正している。関連番号は **309082**。変更理由は「user activationに加えてtrustedイベントを要求したい」というもの。直接クリックでは触覚を維持し、合成クリックでは鳴らさないテストも含む。

これはリリースブランチへのcherry-pick（305413.395@safari-7624-branch）の公開記録。**コミット日だけから特定のiOSリリースへの搭載日を確定することはできない**。iOS 26.5での変化は下記の利用者・作者による実機報告と区別して扱う。

- [WebKit公式変更メーリングリストの記録](https://www.mail-archive.com/webkit-changes@lists.webkit.org/msg249976.html)
- [project-fathom: 作者によるiOS 26.5実機確認](https://github.com/m1ckc3s/project-fathom)
- [web-haptics Issue #41: direct-tap方式の提案](https://github.com/lochie/web-haptics/issues/41)

switch属性はSafari 17.4、iPhoneのswitch触覚はiOS 18で追加された別機能。[WebKit公式 Safari 18記事](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/) が触覚の導入を説明している。`'switch' in input` で触覚やiOSのバージョンは確定できない。

## ハックを許す場合の実用範囲

iOSではnative appearanceを保った本物のswitchを、小さなタップ領域に透明で配置する。指が直接inputに当たるので `.click()` は不要。今回のデモは「お気に入り」のオン・オフで、アクセシビリティ上もチェック状態を持つ操作として扱う。装飾テキストと入力を二重のボタンにしない。

ただしWebKitのswitchはドラッグを捕まえることがある。[Bug 321591](https://bugs.webkit.org/show_bug.cgi?id=321591) にスクロール抑止と領域外リリース時のトグルが報告されている。デモではオーバーレイを初期オフの実験にし、64px高の領域に限定。スライダーや画面全体に敷かず、native appearanceを消さず、`clip-path`でヒット領域をクリップする。OSによる変更に依存するため汎用polyfillのバックエンドには戻さない。

Androidは単一の `vibrate([...])` でパターン全体を送る。繰り返し `setTimeout` で上書きする方法を避ける。今回のパターンはタップ `[25]`、完了 `[35,70,55]`、注意 `[65,150,65]`、エラー `[45,65,45,65,65]`。波形の強度を精密に再現するものではない。0.5〜3倍のパルス長調整と200msの基準を用意し、短いパルスを感じない端末でも切り分けできるようにした。PWMでネイティブ同等の振幅制御ができるとは主張しない。

[Vibration API仕様](https://www.w3.org/TR/vibration/) は前景・sticky activation等の条件を持ち、`true` もモーターの動作確認ではない。実際の成否はユーザーの申告で別に記録する。

### HTTPSについての訂正

実機デモはHTTPSの通常タブで開くのを推奨する。ただし旧READMEの「Vibration APIはsecure context専用、HTTPなら必ず鳴らない」という断言は一次資料で裏付けられない。調査時の [Chromium IDL](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/vibration/navigator_vibration.idl) に `SecureContext` 属性はなく、[実装](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/vibration/vibration_controller.cc) は前景・activation等を確認する。iframeの扱いもブラウザと版に依存するので、このデモでは埋め込まず通常タブで条件を減らす。

## 別の手段はあるか

- **Web Push / 通知**: 通知許可や配信・OS設定に依存する。タップに即応する任意の触覚パターンAPIの代わりにはならない。[Chrome通知サンプル](https://googlechrome.github.io/samples/notifications/vibrate.html)
- **Gamepad API**: 外付けコントローラの触覚。スマホ内蔵モーターではない。
- **Web Audio / 低音**: 音声出力。Taptic Engineを制御する方法ではない。今回のデモには混ぜない。
- **ネイティブのWebViewブリッジ**: アプリをインストールしてよければ [Core Haptics](https://developer.apple.com/documentation/corehaptics) 等を呼べる。通常SafariのWebサイトだけで実現する条件からは外れる。両OSで任意の強度・波形・非同期の完了通知が必須ならこちらが候補。

## 実装と検証

`/lab` を追加。既存の提案APIデモは `/`、従来の合成クリック対照は `/probe` に残した。トップからラボへリンクする。ラボはpolyfillのplayHapticsを使わず、音も出さない。既存のCSS触覚指定（`.btn`）を付けず、余分な短い振動が混ざらないようにした。

検証結果は直前の要求・感触の申告・端末の手入力・UA・API有無をJSONで保存できる。イベントログは30件まで。デバイスの正確なOSバージョンはUAだけで推定しない。サーバーへの送信はない。

### 実機で残っている確認

| 対象 | 手順 | 期待 / 判定 |
|---|---|---|
| iOS 26.6.2 / Safari | 可視switch本体を直接タップ | システムクリック。無振動なら設定・端末・ブラウザを記録 |
| 同上 | 透明switchを有効にしてタップ | 同じクリック感。四隅の誤タップ、周囲のスクロールも確認 |
| 同上 | 同じ可視switchを `.click()` で操作 | 状態は変わるが触覚は出ない予想 |
| Android 17 / Chrome最新版 | 基準200ms→4プリセット | 振動の有無とリズムの違いを人が記録 |
| 同上 | 長さ調整・ノッチ・停止・タブ切替 | 新規要求の上書き、停止、バックグラウンドで継続しないこと |
| 両方 | 振動オフ、キーボード/読み上げ、JSON保存 | オフ時の非作動、意味が正しい操作、結果が保存されること |

**今回のデスクトップ上の型チェック・ビルドは、スマホの物理的な振動確認ではない。** 実機の未検証結果を「成功」に埋めない。

### 今回実施した検証

- `pnpm install --frozen-lockfile`: 成功、依存の変更なし。
- `pnpm check`: TypeScript / svelte-check、エラー0・警告0。
- `pnpm build`: Cloudflare adapterまで成功。この作業環境ではWranglerの書込先をワークスペース内にするため `XDG_CONFIG_HOME` を指定した。
- デスクトップChromiumの `/lab`: 完了パターン `[35,70,55]` と基準 `[200]` の要求表示、振動オフ時のボタン/スライダー/switch無効化、初期画面の表示を確認。
- iOSの透明switch、Androidの実際の触感、読み上げ、スマホでのJSON保存は未検証。
