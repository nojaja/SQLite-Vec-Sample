// SQLite モジュールをインポート
import { default as init } from "sqlite-vec-wasm-demo";
import { env, pipeline } from '@xenova/transformers';

// Embeddingパイプラインの初期化
let embeddingPipeline;

const EmbeddingModel = 'Xenova/multilingual-e5-large'; //600MB
//const EmbeddingModel = 'intfloat/multilingual-e5-large'; //2.24GB
//const EmbeddingModel = 'cl-nagoya/ruri-large-v2'; //337MB

// Specify a custom location for models (defaults to '/models/').
//env.localModelPath = './models/';

// Disable the loading of remote models from the Hugging Face Hub:
//env.allowRemoteModels = false;

// Set location of .wasm files. Defaults to use a CDN.
env.backends.onnx.wasm.wasmPaths = './';

class SQLiteManager {
  static async initialize() {
    // SQLite モジュールを初期化
    const sqlite3 = await init({
      print: console.log,
      printErr: console.error
    });
    return new SQLiteManager(sqlite3);
  }

  constructor(sqlite3) {
    this.sqlite3 = sqlite3;
    const filename = "dbfile_" + (0xffffffff * Math.random() >>> 0);
    // データベースを作成
    this.db = new sqlite3.oo1.DB(filename, "ct");
  }

  exec(sql, bind) {
    const results = [];
    let columnNames = [];
    try {
      this.db.exec({
        sql: sql,
        bind: bind,
        rowMode: 'object',
        callback: (row) => {
          columnNames = Array.from(new Set([...columnNames, ...Object.keys(row)]));
          results.push(Object.values(row));
        }
      });
      return {
        columns: columnNames,
        values: results
      };
    } catch (error) {
      throw error;
    }
  }

  prepare(sql){
    const stmt = this.db.prepare(sql);
    stmt.getRowAsObject = () => this.getRowAsObject(stmt);
    return stmt;
  }

  // ヘルパーメソッド：行データをオブジェクトとして取得
  getRowAsObject(stmt) {
    const obj = {};
    const columnNames = stmt.getColumnNames();
    for (let i = 0; i < columnNames.length; i++) {
      obj[columnNames[i]] = stmt.get(i);
    }
    return obj;
  }

  getColumnNames() {
    const stmt = this.db.prepare("SELECT * FROM sqlite_master LIMIT 1");
    try {
      const columnInfo = stmt.getColumnNames();
      return columnInfo;
    } finally {
      stmt.finalize();
    }
  }

  export() {
    const exportedData = this.sqlite3.capi.sqlite3_js_db_export(this.db);
    console.log(exportedData)
    return exportedData;
  }

  async import(contents) {
    this.db.close();
    const vfsName = 'unix'; // 使用するVFSの名前
    const filename = "dbfile_" + (0xffffffff * Math.random() >>> 0);

    this.sqlite3.capi.sqlite3_js_vfs_create_file(vfsName, filename, contents, contents.length);
    this.db = new this.sqlite3.oo1.DB(filename);
  }

  close() {
    this.db.close();
  }
}

// 入力フィールドとボタンの取得
const inputField = document.getElementById('textInput');
const embedButton = document.getElementById('embedButton');
const insertButton = document.getElementById('insertButton');
const searchButton = document.getElementById('searchButton');
const resultDiv = document.getElementById('result');

// DOMが読み込まれた後に実行
document.addEventListener('DOMContentLoaded', async () => {
  try {
    log('Embeddingパイプラインを初期化中...');
    log('Embedding Model:' + EmbeddingModel + 'を取得中...');
    embeddingPipeline = await pipeline('feature-extraction', EmbeddingModel);
    log('Embeddingパイプラインの初期化が完了しました');


    // SQLite WAMSの初期化
    window.sqliteManager = await SQLiteManager.initialize();

    // vec_version() を実行してバージョンを取得
    const [sqlite_version, vec_version] = window.sqliteManager.exec('select sqlite_version(), vec_version();').values;
    log(`sqlite_version=${sqlite_version}, vec_version=${vec_version}`);
    log('SQLite バージョン情報の取得に成功しました。');

    // テーブルの作成
    window.sqliteManager.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vectors USING vec0(
      embedding float[1024],
      contents TEXT
    )`);
    log('TABLEを作成しました。');


    // ボタンクリックイベントの設定
    insertButton.addEventListener('click', async () => {
      const inputText = inputField.value;
      if (inputText) {
        try {
          log('検索テキストをベクトル化中...');
          const embedding = await generateEmbedding(inputText);
          const [vec_length] = window.sqliteManager.exec(`select vec_length(?);`, embedding.buffer).values;
          console.log(embedding, vec_length);
          log(`ベクトル化が完了しました。vec_length: ${vec_length}, Embedding: ${embedding.slice(0, 5).join(', ')}...`);

          // ベクトルをデータベースに挿入
          insertVector(inputText, embedding);

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
          log('検索テキストをベクトル化中...');
          const embedding = await generateEmbedding(inputText);
          const [vec_length] = window.sqliteManager.exec(`select vec_length(?);`, embedding.buffer).values;
          console.log(embedding, vec_length);
          log(`ベクトル化が完了しました。vec_length: ${vec_length}, Embedding: ${embedding.slice(0, 5).join(', ')}...`);

          // ベクトル検索
          const selectResult = await searchSimilarVectors(embedding, 3);
          document.getElementById('output').textContent = JSON.stringify(selectResult, null, 2);
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

// テキストをベクトル化する関数
async function generateEmbedding(text) {
  const output = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
  //return new Float32Array(Array.from(output.data));
  return new Float32Array(output.data);
}

// ベクトルデータを挿入する関数
async function insertVector(contents, embedding) {
  // ベクトルをデータベースに挿入
  const stmt = window.sqliteManager.prepare("INSERT INTO vectors(embedding, contents) VALUES (?, ?)");
  stmt
    .bind([embedding.buffer, contents])
    .stepReset();

  stmt.finalize();
  log('ベクトルが正常に挿入されました');
}

// 類似ベクトルを検索する関数
async function searchSimilarVectors(embedding, limit = 5) {
  const stmt = window.sqliteManager.prepare("SELECT *,distance FROM vectors WHERE embedding MATCH ? ORDER BY distance LIMIT 3");
  stmt.bind([embedding.buffer]);
  const selectResult = [];
  while (stmt.step()) {
    console.log(stmt);
    console.log(stmt.getColumnNames());
    console.log(stmt.get(2));
    selectResult.push(`ID: ${stmt.get(0)} | Text: ${stmt.get(2)} | Distance: ${stmt.get(3)}`);
  }
  log('検索完了');
  return selectResult;
}


// データエクスポートのイベントハンドラ
document.getElementById("dataexport").onclick = function () {
  const data = window.sqliteManager.export();
  saveFile('Untitled.db', data)
};

// データインポートのイベントハンドラ
document.getElementById("dataimport").onclick = async function () {
  const file = await getFile();
  if (file) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    try {
      await window.sqliteManager.import(arrayBuffer);
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
}

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
