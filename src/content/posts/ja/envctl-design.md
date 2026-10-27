---
title: '[07] envctl の設計と境界'
description: 'ローカル dotenv の編集から、envctl の構成、認証情報のフロー、1Password・SOPS・Compose secrets との分担を考える。'
pubDate: 2026-10-26T18:38:15-07:00
updatedDate: 2026-10-26T18:52:41-07:00
translationKey: homelab-ops-envctl
categories: [Homelab Ops]
tags: [homelab, envctl, secrets, design]
toc: true
---

_envctl はローカル dotenv の編集、保存、実行を扱います。通常経路を改善する一方、調査時の読み取りと知識への伝播は[前回](/ja/posts/secrets-and-credentials/)で扱います。_

[envctl/bakctl v0.1.0](https://github.com/Jarvie8176/envctl/releases/tag/v0.1.0) は既存ツールを独立して公開したものです。key ごとの編集、暗号化、保存、復元をつなぎ、既存のローカル dotenv 操作に使っています。

## ローカル carrier を残す理由

認証情報の記録に既に 1Password を使い、設定を Git に置き、一部の常駐処理や復旧を毎回の vault 読み取りに依存させないことを求めています。1Password を記録の出所、SOPS + age を暗号化、ローカルやサービス用 carrier を実行入力にします。出所の編集だけでは業務 token の失効やコピーの更新は起きません。

| 場所              | 役割                                 | 保守する境界                          |
| ----------------- | ------------------------------------ | ------------------------------------- |
| 1Password         | 認証情報の記録と参照                 | 権限、期限、利用先、実際の発行状態    |
| SOPS + age        | Git 向け暗号化設定                   | recipient、秘密鍵、復旧、過去の暗号文 |
| envctl + bakctl   | dotenv の編集、保存、実行            | 形式、版、読み書き、出力              |
| envsync + doco-cd | サービス用 SOPS carrier の生成と利用 | 交付、配備、陳腐化、実際の使用        |

carrier は利用先へ渡す設定コピーです。envsync が 1Password からサービス用 SOPS ファイルを生成し、doco-cd が配備時に復号して Compose の補間に使います。コントローラの最初の Git 認証には別の bootstrap 経路があり、権限制限したローカル平文も管理対象です。すべての利用先に全層は不要です。[SOPS](https://getsops.io/docs/) · [age](https://github.com/FiloSottile/age)

## 標準機能で足りるなら層を省ける

即時アクセスを許容するなら `op run`、既存 SOPS ファイルの実行だけなら `sops exec-env`、ファイルを使うプログラムなら `exec-file` をまず検討できます。注入は envctl 独自ではありません。差分は key ごとの stdin 編集、他行の保持、候補暗号文の復号確認、排他とアトミックな置換、対になる保存と復元の約束にあります。[SOPS のプロセス実行](https://getsops.io/docs/usage/advanced/#passing-secrets-to-other-processes)

コンテナでは Compose `secrets:` で対象サービスへファイルを渡し、値が環境に直接入るのを避けられます。これは消費方式、SOPS は保存形式、envctl は一部の編集を担います。一つを使うために全層を追加する必要はありません。アプリの対応確認が必要で、通常のファイルマウントは元ファイルを暗号化せず、Docker 管理者の読み取りも防ぎません。[Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)

既存 dotenv の編集需要に envctl を使い、需要のない利用先では省けます。発行、更新、実行権限はそれぞれの入口で管理します。

## 現在の構成と既定動作

![認証情報スタックと envctl の論理構成](/images/secrets/components-ja.png)

_現在は一つのスクリプト内で、設定、編集、保存、バックアップ、実行の責任を分けています。_

| 論理的な役割            | 内容                                             |
| ----------------------- | ------------------------------------------------ |
| CLI と設定              | 対象、コマンド、SOPS、鍵設定を選ぶ               |
| Document                | 値を編集し、他行を保ち、繰り返しの書き込みを扱う |
| Storage と SOPS adapter | 読み取り、暗号化、復号、候補確認、置換           |
| Backup adapter          | bakctl による保存、履歴、復元                    |
| Runner と Output        | 環境注入、または要求されたキー名と値の出力       |

v0.1.0 は候補暗号文の復号確認後にアトミックに置換し、排他と入力確認を備えます。暗号化対象の一時ファイルと bakctl のコピーは暗号文で、合成テストがあります。この部分は書き込みの完全性を扱います。[公開版の安全モデル](https://github.com/Jarvie8176/envctl/blob/v0.1.0/docs/security-model.md)

注意する既定値は三つです。対象は歴史的に平文 `~/cc/.env`、自動暗号化は末尾 `.enc` のみ、`exec` は親環境とファイル内の全変数を渡します。`get/export` は意図的に値を、`list` はキー名を出します。用途別ファイルで範囲を減らせますが、コマンド別の変数許可リストや同ユーザーの隔離はありません。

## 空の項目から実行までの五段階を設計する

既存の機能を次の流れへ接続する予定です。envctl には stdin 編集とプロセス注入があり、安全な取り込み、業務確認スクリプト、共通の返却形式はこれから書きます。架空の `op://demo-vault/demo-service/credential` と `DEMO_API_TOKEN` を例にします。

![認証情報の作成と注入の五段階目標設計](/images/secrets/use-case-ja.png)

1. **Agent が基礎を準備する。** 許可された実行側で op、SOPS、age、対のツールを準備し、実行版、recipient、権限、復旧を確認し、一時的な鍵と合成値で試します。最初の op 認証は既存の正規 bootstrap 経路で行います。
2. **Agent が空の項目を作る。** 指定 vault にサービス、用途、利用先、必要フィールドを記録し、参照を返します。秘密欄はユーザーに記入してもらい、取り込み前に内容を確認します。[1Password 項目 API](https://www.1password.dev/cli/reference/management-commands/item)
3. **Human が入力する。** 発行元で権限と期限を確認し、直接 1Password に入力します。会話には完了だけを伝えます。
4. **Agent が管理された取り込みを依頼する。** 引数は参照、対象 key、明示的な暗号化ファイルだけです。信頼できるローカル取り込み側が読み取り成功、欄の存在、非空、形式を確認してから stdin で書きます。失敗時は旧値を保ち、状態だけを返します。op の出力を setter へ直結すると上流失敗前に空値を書けてしまい、pipefail は戻せません。暗号文の復号確認も入力検査を代替しません。
5. **Agent が管理された実行を依頼する。** 業務プロセス内で値を使い、合意した状態を返します。認証引数、デバッグログ、応答全文、例外に値を出しません。合成 canary で正常と失敗の stdout、stderr、引数、成果物を確認し、失敗時の旧媒体保持も検証します。

この流れは通常使用時の値を扱います。探索的な調査と露出後の更新の取捨は[前回](/ja/posts/secrets-and-credentials/)で考えました。

## 複雑さの四問でコピーを選ぶ

出所、サービス carrier、ローカルファイル、bootstrap に同じ値が存在し得ます。出所の構造化だけでは数は減りません。[シリーズの四問](/ja/posts/pr-review-too-many/)を適用します。

- **起きた何を解決するか。** 記録集約、Git 設定、即時アクセス削減、起動には用途があります。調査の露出はコピーを増やして解決しません。
- **簡単な経路で足りるか。** op run、SOPS 標準実行、直接ファイル消費で足りるなら envctl のコピーを省きます。
- **保守は何が増えるか。** 出所、利用先、生成と配備の版、更新時刻、権限、更新責任を記録し、実際の認証操作を確認します。秘密のハッシュを公開証明にしません。
- **削除すると何を失うか。** キャッシュをなくすと即時アクセス依存が戻り、envctl をなくすと編集と保存の約束を失いますが SOPS の注入は残ります。利用先ごとに決めます。

次はコピー一覧と陳腐化確認を補い、不要な層を減らし、更新失敗、未配備、旧値の使用を見えるようにします。

## 次に変えたいこと

v0.1.0 では対の CLI、編集と保存、書き込み保護を整理しました。次は汎用 op 取り込み、五段階に沿う業務確認、共通の返却形式です。

agent モードも作りたいと考えています。暗号化ファイルを明示し、get/export を拒否し、宣言変数だけを渡して親環境を選別し、操作と返却フィールドを限定します。気軽な値の読み出しを減らし、任意プログラムの読み取りと出力は独立した実行権限で扱います。

導入は [README の固定版手順](https://github.com/Jarvie8176/envctl#install-a-fixed-release)と [Releases](https://github.com/Jarvie8176/envctl/releases)を参照してください。既存環境は[連携と移行の規約](https://github.com/Jarvie8176/envctl/blob/main/docs/integrations.md)に沿って別の prefix で検証してから切り替え、対の版と実行ファイルを確認します。コピーした各ノードを更新し、切り替え後に実際の業務認証を確認します。
