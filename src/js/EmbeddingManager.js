import { env, pipeline } from '@xenova/transformers';

const EmbeddingModel = 'Xenova/multilingual-e5-large'; //600MB
//const EmbeddingModel = 'intfloat/multilingual-e5-large'; //2.24GB
//const EmbeddingModel = 'cl-nagoya/ruri-large-v3'; //337MB

// Specify a custom location for models (defaults to '/models/').
//env.localModelPath = './models/';

// Disable the loading of remote models from the Hugging Face Hub:
//env.allowRemoteModels = false;

// Set location of .wasm files. Defaults to use a CDN.
env.backends.onnx.wasm.wasmPaths = './';

class EmbeddingManager {
    // シングルトンインスタンスを保持する静的プロパティ
    static #instance = null;
    /**
     * EmbeddingManagerのコンストラクタ
     */
    constructor(options = {}) {
        // 既にインスタンスが存在する場合はエラー
        if (EmbeddingManager.#instance) {
            throw new Error('EmbeddingManagerは直接インスタンス化できません。getInstance()を使用してください。');
        }
        this.print = options.print || (() => { });
        this.printErr = options.printErr || (() => { });
        // このインスタンスを唯一のインスタンスとして設定
        EmbeddingManager.#instance = this;
    }

    /**
     * EmbeddingManagerを初期化する静的メソッド
     * @param {ArrayBuffer} data - 既存のデータベースデータ（オプション）
     * @returns {Promise<EmbeddingManager>} 初期化されたEmbeddingManagerインスタンス
     */
    static async initialize(options) {
        // インスタンスが未作成の場合は作成して初期化
        if (!EmbeddingManager.#instance) {
            const instance = new EmbeddingManager(options);
            await instance.setupEmbeddingEnvironment();
            return instance;
        }
        // 既存のインスタンスが存在する場合はそれを返す
        return EmbeddingManager.#instance;
    }

    /**
     * 埋め込み環境のセットアップ
     * @returns {Promise<void>}
     */
    async setupEmbeddingEnvironment() {
        this.print('Embeddingパイプラインを初期化中...');
        this.print('Embedding Model:' + EmbeddingModel + 'を取得中...');
        // Embeddingパイプラインの初期化
        this.embeddingPipeline = await pipeline('feature-extraction', EmbeddingModel,{device: 'webgpu'});
        this.print('Embeddingパイプラインの初期化が完了しました');

    }

    /**
     * テキストの埋め込みベクトルを生成する
     * @param {string} text - 埋め込みベクトル化するテキスト
     * @returns {Promise<Float32Array>} 埋め込みベクトル
     */
    async generateEmbedding(text) {
        const output = await this.embeddingPipeline(text, { pooling: 'mean', normalize: true });
        //return new Float32Array(Array.from(output.data));
        return new Float32Array(output.data).buffer;
    }

}

export default EmbeddingManager;