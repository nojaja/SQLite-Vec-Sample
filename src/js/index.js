// SQLite モジュールをインポート
import { default as init } from "sqlite-vec-wasm-demo";
import { env, pipeline } from '@xenova/transformers';

// Embeddingパイプラインの初期化
let embeddingPipeline;
let db;
let sqlite3;
let filename = "dbfile_" + (0xffffffff * Math.random() >>> 0);

const EmbeddingModel = 'Xenova/multilingual-e5-large'; //600MB
//const EmbeddingModel = 'intfloat/multilingual-e5-large'; //2.24GB

// Specify a custom location for models (defaults to '/models/').
//env.localModelPath = './models/';

// Disable the loading of remote models from the Hugging Face Hub:
//env.allowRemoteModels = false;

// Set location of .wasm files. Defaults to use a CDN.
env.backends.onnx.wasm.wasmPaths = './';


// 入力フィールドとボタンの取得
const inputField = document.getElementById('textInput');
const embedButton = document.getElementById('embedButton');
const insertButton = document.getElementById('insertButton');
const searchButton = document.getElementById('searchButton');
const resultDiv = document.getElementById('result');


function log(message) {
  console.log(message);
  //resultDiv.textContent = message;
  const div = resultDiv.appendChild(document.createElement('div'));
  div.innerText = message;
    // 結果を表示するための div 要素を作成
    // const div = document.body.appendChild(document.createElement('div'));
    // div.innerText = versionText;
}


// DOMが読み込まれた後に実行
document.addEventListener('DOMContentLoaded', async () => {
  try {
    log('Embeddingパイプラインを初期化中...');
    log('Embedding Model:'+ EmbeddingModel+'を取得中...');
    embeddingPipeline = await pipeline('feature-extraction', EmbeddingModel);
    log('Embeddingパイプラインの初期化が完了しました');

    // SQLite モジュールを初期化
    sqlite3 = await init();

    filename = "dbfile_" + (0xffffffff * Math.random() >>> 0);

    // データベースを作成
    db = new sqlite3.oo1.DB(filename);
    
    // vec_version() を実行してバージョンを取得
    const [sqlite_version, vec_version] = db.selectArray('select sqlite_version(), vec_version();')
    log(`sqlite_version=${sqlite_version}, vec_version=${vec_version}`);
    log('SQLite バージョン情報の取得に成功しました。');

    // テーブルの作成
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vectors USING vec0(
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
          const vec_length = db.selectArray(`select vec_length(?);`, embedding.buffer);
          console.log(embedding,vec_length);
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
          const vec_length = db.selectArray(`select vec_length(?);`, embedding.buffer);
          console.log(embedding,vec_length);
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
  const stmt = db.prepare("INSERT INTO vectors(embedding, contents) VALUES (?, ?)");
  stmt
    .bind(1, embedding.buffer)
    .bind(2, contents)
    .stepReset();

  stmt.finalize();
  log('ベクトルが正常に挿入されました');
}

// 類似ベクトルを検索する関数
async function searchSimilarVectors(embedding, limit = 5) {
  const stmt = db.prepare("SELECT *,distance FROM vectors WHERE embedding MATCH ? ORDER BY distance LIMIT 3");
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

/**
 * Saves a file by creating a downloadable instance, and clicking on the
 * download link.
 *
 * @param {string} filename Filename to save the file as.
 * @param {arrayBuffer} contents Contents of the file to save.
 */
// function saveAsLegacy(filename, contents) {
function saveAsLegacy(filename, contents) {
  let atag = document.createElement('a')
  atag.id = "aDownloadFile"
  atag.download = true

  filename = filename || 'Untitled.db';
  const opts = { type: 'application/sqlite.db' };
  const file = new File([contents], '', opts);
  atag.href = window.URL.createObjectURL(file);
  atag.setAttribute('download', filename);
  atag.click();
};

let dataexport = function () {
  const exportedData = sqlite3.capi.sqlite3_js_db_export(db);
  console.log(exportedData)
  saveAsLegacy('Untitled.db', exportedData)
}


/**
 * Uses the <input type="file"> to open a new file
 *
 * @return {!Promise<File>} File selected by the user.
 */
function getFileLegacy() {
  let inputtag = document.createElement('input')
  inputtag.id = "filePicker"
  inputtag.type = "file"
  //document.body.appendChild(inputtag)

  return new Promise((resolve, reject) => {
    inputtag.onchange = (e) => {
      const file = inputtag.files[0];
      if (file) {
        resolve(file);
        return;
      }
      reject(new Error('AbortError'));
    };
    inputtag.click();
  });
};

/**
 * Reads the raw text from a file.
 *
 * @private
 * @param {File} file
 * @return {Promise<string>} A promise that resolves to the parsed string.
 */
function readFileLegacy(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (e) => {
      //const content = e.srcElement.result;
      const content = reader.result;
      resolve(content);
    });
    //reader.readAsBinaryString(file);
    reader.readAsArrayBuffer(file);
  });
}
let dataimport = async function () {
    // Load the db
    const filebuffer = await getFileLegacy()
    const contents = await readFileLegacy(filebuffer);

    const vfsName = 'unix'; // 使用するVFSの名前
    filename = "dbfile_" + (0xffffffff * Math.random() >>> 0);

    sqlite3.capi.sqlite3_js_vfs_create_file(vfsName, filename, contents, contents.length); 
    db = new sqlite3.oo1.DB(filename);
    log('データベースを読み込みました');
}

document.getElementById("dataexport").onclick = dataexport
document.getElementById("dataimport").onclick = dataimport
