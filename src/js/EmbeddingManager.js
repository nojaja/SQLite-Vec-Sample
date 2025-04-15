
import jsonata from "jsonata";
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

class EmbeddingManager {
    /**
     * EmbeddingManagerのコンストラクタ
     */
    constructor(options = {}) {
        this.print = options.print || (() => { });
        this.printErr = options.printErr || (() => { });
        this.jsonata = jsonata;
    }

    /**
     * EmbeddingManagerを初期化する静的メソッド
     * @param {ArrayBuffer} data - 既存のデータベースデータ（オプション）
     * @returns {Promise<EmbeddingManager>} 初期化されたEmbeddingManagerインスタンス
     */
    static async initialize(options) {
        const instance = new EmbeddingManager(options);
        // 追加の初期化処理（必要に応じて実装）
        await instance.setupEmbeddingEnvironment();

        return instance;
    }

    /**
     * 埋め込み環境のセットアップ
     * @returns {Promise<void>}
     */
    async setupEmbeddingEnvironment() {

        this.print('Embeddingパイプラインを初期化中...');
        this.print('Embedding Model:' + EmbeddingModel + 'を取得中...');
        embeddingPipeline = await pipeline('feature-extraction', EmbeddingModel);
        this.print('Embeddingパイプラインの初期化が完了しました');

    }

    prepare(query) {
        const expression = this.jsonata(query);
        expression.registerFunction("generateEmbedding", async (text) => await this.generateEmbedding(text), "<s>");
        return expression;
    }

    evaluate(query, data) {
        return this.prepare(query).evaluate(data);
    }


    /**
     * テキストの埋め込みベクトルを生成する
     * @param {string} text - 埋め込みベクトル化するテキスト
     * @returns {Promise<Float32Array>} 埋め込みベクトル
     */
    async generateEmbedding(text) {
        const output = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
        //return new Float32Array(Array.from(output.data));
        return new Float32Array(output.data).buffer;
    }

}

export default EmbeddingManager;