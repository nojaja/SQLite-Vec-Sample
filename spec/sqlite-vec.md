Node.jsを使用して下記のプログラムを作成し、それに対応するJestテストコードを生成してください。
以下の要件と条件を満たすようにしてください：

## ブラウザ上で完結するsqlite-vecサンプルサイト

このプロジェクトは、
[sqlite-vec](https://github.com/asg017/sqlite-vec)を使用して、
Embeddingのベクトル値のINSERT、SELECTをブラウザ上で完結させることを目的としています。

プログラムの仕様は以下の通りです：

1. 機能:
   - [sqlite-vec](https://github.com/asg017/sqlite-vec)を使用して、テキストボックスに入力されたベクトル値をINSETする
   - [sqlite-vec](https://github.com/asg017/sqlite-vec)を使用して、テキストボックスに入力されたベクトル値と近い値をSELECTする

2. sqlite-vecのブラウザ稼働条件：
  下記のサイトでsqlite-vecのwasmサンプルが提示されているので、参考にすること
   - [sqlite-vec wasm minimal demo](https://codepen.io/asg017_ucsd/pen/MWMpJNY)

3. その他の要件:
   - コードは適切にコメントを付け、読みやすく構造化する

4. 技術的な条件
   - Node.js バージョン: v14.17.0
   - Webpack バージョン: v5.74 (バンドル化)
   - Jest バージョン: v26.6.3
   - ログメッセージ: 日本語で表記

プログラムの使用例と、実行方法も含めてください。
また、このアプローチの利点と制限事項についても簡単に説明してください。
