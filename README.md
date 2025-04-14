# SQLite-Vec-Sample

## 概要
このプロジェクトは、[sqlite-vec](https://github.com/asg017/sqlite-vec)と[Transformer.js](https://github.com/huggingface/transformers.js)を使用して、ドキュメントのEmbedding生成からベクトルデータベースのインデクシングまでのすべての処理をブラウザ上で完結動作するサンプルです。

## 作成について
このプロジェクトはsql.jsでの実装をClaude 3.7 Sonnetを使ってsqlite-vecに移植したものです。

利用モデル：intfloat/multilingual-e5-large

## 参考記事
[emKdB](https://emkdb.raspi0124.dev/)
[SQLiteと「intfloat/multilingual-e5-large」を使っておすそ分けベクトル検索](https://qiita.com/kongo-jun/items/8e0f3dda9448d7a20d05)

## セットアップ手順
1. リポジトリをクローンします。
    ```sh
    git clone https://github.com/nojaja/SQLite-Vec-Sample.git
    ```
2. 必要な依存関係をインストールします。
    ```sh
    npm install
    ```
3. 開発サーバーを起動します。
    ```sh
    npm start
    ```
4. open browser
    ```
    http://localhost:8080
    ```

## プログラムの仕様

### 機能
- emKdBのsqlite-vec実装
- [Transformer.js](https://github.com/huggingface/transformers.js)を使用して、テキストボックスに入力された値をベクトル化する
- ベクトル化したデータを[sqlite-vec](https://github.com/asg017/sqlite-vec)にINSERTする
- INSERTしたデータを検索する

### 実装詳細
- DBはsqlite-vecを利用する
- ドキュメントのEmbedding生成はTransformer.jsを利用する
- sqlite-vecをブラウザ上で稼働させるためには[CodePen Home sqlite-vec wasm minimal demo](https://codepen.io/asg017_ucsd/pen/MWMpJNY)を使う

### 利用モデル
- intfloat/multilingual-e5-large

### その他の要件
- 外部ライブラリを使用せず、標準モジュールのみで実装する
- コードは適切にコメントを付け、読みやすく構造化する

## 使用例と実行方法
1. テキストボックスにテキストを入力します。
2. 「ベクトル化」ボタンをクリックして、テキストをベクトル化します。
3. 「INSERT」ボタンをクリックして、ベクトル化したデータをデータベースに挿入します。
4. 「検索」ボタンをクリックして、データベースからベクトルデータを検索します。

## 利点と制限事項
### 利点
- すべての処理がブラウザ上で完結するため、サーバーサイドの設定が不要です。
- SQLiteとTransformer.jsを組み合わせることで、高度なベクトル検索機能を簡単に実装できます。

### 制限事項
- ブラウザの性能に依存するため、大規模なデータセットの処理には向いていません。
- WebAssemblyのサポートが必要です。

## License

Licensed under the [MIT](LICENSE) License.
