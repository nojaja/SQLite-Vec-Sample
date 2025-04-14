// SQLite モジュールをインポート
import { default as init } from 'sqlite-vec-wasm-demo';

class SQLiteManager {
  static async initialize(data) {
    // SQLite モジュールを初期化
    const sqlite3 = await init({
      print: console.log,
      printErr: console.error
    });
        const sqlite3_instance = new SQLiteManager(sqlite3, data);
        // sqlite3_instanceにoriginalプロパティを作成
        sqlite3_instance.original = { db: {} };

        // 元のprepareメソッドを保存
        sqlite3_instance.original.db.prepare = sqlite3_instance.db.prepare;
        sqlite3_instance.original.db.exec = sqlite3_instance.db.exec;

        // db.prepareをオーバーライド
        sqlite3_instance.db.prepare = function (sql) {
            return sqlite3_instance.prepare(sql);
        };
        // db.execをオーバーライド
        sqlite3_instance.db.exec = function (sql, bind) {
            return sqlite3_instance.exec(sql, bind);
        };
        return sqlite3_instance;
  }

  constructor(sqlite3, data) {
    this.sqlite3 = sqlite3;
        // ファイル名生成
    this.currentFilename = "dbfile_" + (0xffffffff * Math.random() >>> 0);
        if (data) {
            // VFSを使用してデータをインポート
            sqlite3.capi.sqlite3_js_vfs_create_file(
                'unix',
                this.currentFilename,
                data,
                data.length
            );
        }
    // データベースを作成
    this.db = new sqlite3.oo1.DB(this.currentFilename, "ct");
  }

  exec(sql, bind) {
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
  }

  prepare(sql) {
        // 元のprepareメソッドを呼び出し
        const stmt = this.original.db.prepare.call(this.db, sql);
        // SQLiteManagerのカスタマイズを適用
        stmt.getRowAsObject = () => this.getRowAsObject.call(this,stmt);
        stmt.getAsObject = () => this.getRowAsObject.call(this,stmt); //sql.js
        
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

  export() {
    const exportedData = this.sqlite3.capi.sqlite3_js_db_export(this.db);
    return exportedData;
  }

  async import(contents) {
    this.db.close();
    const vfsName = 'unix'; // 使用するVFSの名前
    this.currentFilename = "dbfile_" + (0xffffffff * Math.random() >>> 0);

    this.sqlite3.capi.sqlite3_js_vfs_create_file(vfsName, this.currentFilename, contents, contents.length);
    this.db = new this.sqlite3.oo1.DB(this.currentFilename);
  }

  close() {
    this.db.close();
  }
}
export default SQLiteManager