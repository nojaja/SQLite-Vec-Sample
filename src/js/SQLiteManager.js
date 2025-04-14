// SQLite モジュールをインポート
import { default as init } from "sqlite-vec-wasm-demo";

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
      return [{
        columns: columnNames,
        values: results
      }];
    } catch (error) {
      throw error;
    }
  }

  prepare(sql) {
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
export default SQLiteManager