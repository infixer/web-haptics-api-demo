# haptics-morse

モールス信号を「振動」で送受信する Web アプリ。
[Web Haptics API](https://github.com/WICG/web-haptics)（提案中）の勉強会 LT のデモ台。

> **なぜモールスなのか**
> モールスは「持続時間」の言語（短点 1 単位 / 長点 3 単位）。
> 一方 Web Haptics API は「意味」の API（`hint`/`edge`/`tick`/`align` の 4 つだけ、duration なし）。
> **だから `playHaptics` だけでは原理的にモールスが打てない。**
> この「できなさ」を可視化することが、このアプリの存在理由。

## ドキュメント

| | |
|---|---|
| [docs/DESIGN.md](docs/DESIGN.md) | 設計書。アーキテクチャ、3 つの Transport、ポリフィル要件、画面設計、ロードマップ |
| [docs/TALK.md](docs/TALK.md) | 10 分 LT の進行台本 |
| [docs/IDEAS.md](docs/IDEAS.md) | Web Haptics API を使った他のアプリ案 |

## 現在の状態

**設計フェーズ。** 実装はまだ入っていない。
実装順は [DESIGN.md § 8 ロードマップ](docs/DESIGN.md#8-実装ロードマップ) を参照。

## 関連リポジトリ

- `infixer/web-haptics-polyfill` — `navigator.playHaptics` のポリフィル（別リポジトリ・未着手）

## 参考

- [WICG/web-haptics](https://github.com/WICG/web-haptics)
- [MSEdgeExplainers / Haptics explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/Haptics/explainer.md)
- [lochie/web-haptics](https://github.com/lochie/web-haptics) — 参考ライブラリ（PWM / iOS switch hack）
