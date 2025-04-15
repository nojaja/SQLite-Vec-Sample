// SQLite モジュールをインポート
import { default as init } from 'sqlite-vec-wasm-demo';

class SQLiteManager {
  static async initialize(data, options) {
    // SQLite モジュールを初期化
    const sqlite3 = await init({
      print: options.print || (() => { }),
      printErr: options.printErr || (() => { })
    });

    const sqlite3_instance = new SQLiteManager(sqlite3, options);
    await sqlite3_instance.setupEnvironment(data);
    return sqlite3_instance;
  }

  constructor(sqlite3, options = {}) {
    this.print = options.print || (() => { });
    this.printErr = options.printErr || (() => { });
    this.sqlite3 = sqlite3;
    this.original = { db: {} };
    this.db = null;
  }

  async setupEnvironment(data) {
    // ファイル名生成
    this.currentFilename = "dbfile_" + (0xffffffff * Math.random() >>> 0);
    if (data) {
      // VFSを使用してデータをインポート
      this.sqlite3.capi.sqlite3_js_vfs_create_file(
        'unix',
        this.currentFilename,
        data,
        data.length
      );
    }
    // データベースを作成
    this.db = new this.sqlite3.oo1.DB(this.currentFilename, "ct");
    // sqlite3_instanceにoriginalプロパティを作成
    this.original = { db: {} };

    // 元のprepareメソッドを保存
    this.original.db.prepare = this.db.prepare;
    this.original.db.exec = this.db.exec;

    // db.prepareをオーバーライド
    this.db.prepare = (sql) => {
      // 元のprepareメソッドを呼び出し
      const stmt = this.original.db.prepare.call(this.db, sql);
      // SQLiteManagerのカスタマイズを適用
      stmt.getRowAsObject = () => this.getRowAsObject.call(this, stmt);
      stmt.getAsObject = () => this.getRowAsObject.call(this, stmt); //sql.js

      return stmt;
    };
    // db.execをオーバーライド
    this.db.exec = (sql, bind) => {
      const results = [];
      let columnNames = [];
      try {
        this.original.db.exec.call(this.db, {
          sql: sql,
          bind: bind,
          rowMode: 'object',
          callback: (row) => {
            columnNames = Array.from(new Set([...columnNames, ...Object.keys(row)]));
            results.push(Object.values(row));
          }
        });
        return [{
          columns: columnNames,
          values: results
        }];
      } catch (error) {
        throw error;
      }
    };
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

  export() {
    const exportedData = this.sqlite3.capi.sqlite3_js_db_export(this.db);
    return exportedData;
  }

  async import(contents) {
    this.db.close();
    await this.setupEnvironment(contents);
  }

  close() {
    this.db.close();
  }
}
export default SQLiteManager