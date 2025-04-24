import SQLiteManager from './SQLiteManager.js'
import DataTransformation from './DataTransformation.js'
import EmbeddingManager from './EmbeddingManager.js'

// 入力フィールドとボタンの取得
const inputField = document.getElementById('textInput');
const embedButton = document.getElementById('embedButton');
const insertButton = document.getElementById('insertButton');
const searchButton = document.getElementById('searchButton');
const resultDiv = document.getElementById('result');

// DOMが読み込まれた後に実行
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // SQLite WAMSの初期化
    window.sqliteManager = await SQLiteManager.initialize(null, {
      print: console.log,
      printErr: console.error
    });
    log('SQLite WAMS initialized');
    // vec_version() を実行してバージョンを取得
    const [sqlite_version, vec_version] = window.sqliteManager.db.exec('select sqlite_version(), vec_version();')[0].values[0];
    log(`sqlite_version=${sqlite_version}, vec_version=${vec_version}`);
    log('SQLite バージョン情報の取得に成功しました。');

    window.dataTransformation = await DataTransformation.initialize({
      print: log,
      printErr: console.error
    });

    window.embeddingManager = await EmbeddingManager.initialize({
      print: log,
      printErr: console.error
    });
    window.dataTransformation.registerFunction("generateEmbedding", async (text) => await window.embeddingManager.generateEmbedding(text), "<s>");

    // テーブルの作成
    window.sqliteManager.db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vectors USING vec0(
      embedding float[1024],
      contents TEXT
    )`);
    log('TABLEを作成しました。');


    // ボタンクリックイベントの設定
    insertButton.addEventListener('click', async () => {
      const inputText = inputField.value;
      if (inputText) {
        try {
          // ベクトルをデータベースに挿入
          insertVector(inputText);

        } catch (error) {
          console.error('ベクトル化中にエラーが発生しました:', error);
          log('エラーが発生しました。もう一度お試しください。');
        }
      } else {
        log('テキストを入力してください。');
      }
    });

    // 検索ボタンクリックイベントの設定
    searchButton.addEventListener('click', async () => {
      const inputText = inputField.value;
      if (inputText) {
        try {
          // ベクトル検索
          await searchSimilarVectors(inputText, 3);
        } catch (error) {
          console.error('ベクトル化中にエラーが発生しました:', error);
          log('エラーが発生しました。もう一度お試しください。');
        }
      } else {
        log('テキストを入力してください。');
      }
    });
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
});

// ベクトルデータを挿入する関数
async function insertVector(contents) {
  log('テキストをベクトル化中...');
  const data = await window.dataTransformation.evaluate('$merge([$, {"$embedding": $generateEmbedding($."$contents")}])', { '$contents': contents });
  console.log(data);
  // ベクトルをデータベースに挿入
  const stmt = window.sqliteManager.db.prepare("INSERT INTO vectors(embedding, contents) VALUES ($embedding, $contents)");
  stmt
    .bind(data)
    .stepReset();
  stmt.finalize();
  log('ベクトルが正常に挿入されました');
}

// 類似ベクトルを検索する関数
async function searchSimilarVectors(contents, limit = 5) {
  log('テキストをベクトル化中...');
  const data = await window.dataTransformation.evaluate('{"$embedding": $generateEmbedding($."$contents"), "$limit":$."$limit"}', { '$contents': contents, '$limit': limit });
  console.log(data);

  const sql = "SELECT *,distance FROM vectors WHERE embedding MATCH $embedding ORDER BY distance LIMIT $limit";
  console.log(sql);
  addResult('sql    > ' + sql);
  const result = window.sqliteManager.db.exec(sql,data)[0];
  console.log(result);

  if (result && result.values.length > 0) {
    // "embedding" 列のインデックスを取得
    const removeIdx = result.columns.indexOf('embedding');
    // embedding 列を除いた columns を出力
    const cols = result.columns.filter((_, i) => i !== removeIdx);
    addResult('result.columns> ' + cols.join(', '));
    // 各行から embedding の値を除いて出力
    result.values.forEach(row => {
      const vals = row.filter((_, i) => i !== removeIdx);
      addResult('result.values> ' + vals.join(', '));
    });
  }
  // const stmt = window.sqliteManager.db.prepare("SELECT *,distance FROM vectors WHERE embedding MATCH $embedding ORDER BY distance LIMIT $limit");
  // stmt.bind(data);
  // const selectResult = [];
  // while (stmt.step()) {
  //   console.log(stmt);
  //   console.log(stmt.getColumnNames());
  //   console.log(stmt.get(2));
  //   selectResult.push(`ID: ${stmt.get(0)} | Text: ${stmt.get(2)} | Distance: ${stmt.get(3)}`);
  // }
  log('検索完了');
}

// データエクスポートのイベントハンドラ
document.getElementById("dataexport").onclick = async function () {
  const data = await window.sqliteManager.export();
  saveFile('Untitled.db', data)
};

// データインポートのイベントハンドラ
document.getElementById("dataimport").onclick = async function () {
  const file = await getFile();
  if (file) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    try {
      const data = new Uint8Array(arrayBuffer);
      await window.sqliteManager.import(data);
      log('Import completed successfully');
    } catch (error) {
      log('Import error: ' + error.message);
    }
  }
};

// ヘルパー関数
function log(message) {
  console.log(message);
  //resultDiv.textContent = message;
  const div = resultDiv.appendChild(document.createElement('div'));
  div.innerText = message;
  // 結果を表示するための div 要素を作成
  // const div = document.body.appendChild(document.createElement('div'));
  // div.innerText = versionText;
}

function addResult(data) {
  const code = document.createElement("li");
  code.textContent = data;
  document.getElementById("output").appendChild(code);
}

/**
 * Saves a file by creating a downloadable instance, and clicking on the
 * download link.
 *
 * @param {string} filename Filename to save the file as.
 * @param {arrayBuffer} contents Contents of the file to save.
 */
function saveFile(filename, contents) {
  const blob = new Blob([contents], { type: 'application/sqlite.db' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

async function getFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      resolve(input.files[0]);
    };
    input.click();
  });
}

async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
