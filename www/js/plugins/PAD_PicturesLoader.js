/*:
 * @plugindesc PADアセット対応ピクチャ表示（カテゴリ別プリロード）  
 * @author -
 */

var PAD_PicturesLoader = PAD_PicturesLoader || {};

(function() {

    PAD_PicturesLoader.preloadBitmaps = {};

    //===========================
    // PAD専用ロード関数（キャッシュ対応）
    //===========================
    Bitmap.loadPadPicture = function(name) {
        if (PAD_PicturesLoader.preloadBitmaps[name]) {
            return PAD_PicturesLoader.preloadBitmaps[name];
        }

        const bitmap = new Bitmap();
        bitmap._image = new Image();

        bitmap._image.onload  = function() { if(bitmap._image) bitmap._onLoad(); };
        bitmap._image.onerror = function() { if(bitmap._image) bitmap._onError(); };

        const path = "asset_pack/img/pictures/" + encodeURIComponent(name) + ".png";
        bitmap._image.src = path;

        PAD_PicturesLoader.preloadBitmaps[name] = bitmap;
        return bitmap;
    };

    //===========================
    // カテゴリ別プリロード
    // categoryPatterns: { category: [ { prefix, start, end }, ... ] }
    //===========================
    PAD_PicturesLoader.preloadCategory = function(category) {
        const categoryPatterns = {
            A: [
            { prefix: "Enemy_01A_", start: 1, end: 52 },
            { prefix: "Enemy_02A_", start: 1, end: 55 },
            { prefix: "Enemy_03A_", start: 1, end: 53 },
            { prefix: "Enemy_04Aa_", start: 1, end: 62 },
            { prefix: "Enemy_04Ab_", start: 1, end: 30 },
            { prefix: "Enemy_04Ac_", start: 1, end: 61 }
            ],
            B: [
            { prefix: "Enemy_01B_", start: 1, end: 52 },
            { prefix: "Enemy_02B_", start: 1, end: 52 },
            { prefix: "Enemy_03B_", start: 1, end: 52 },
            { prefix: "Enemy_04Ba_", start: 1, end: 57 },
            { prefix: "Enemy_04Bb_", start: 1, end: 38 },
            { prefix: "Enemy_04Bc_", start: 1, end: 61 }
            ],
            C: [
            { prefix: "Enemy_01C_", start: 1, end: 52 },
            { prefix: "Enemy_02C_", start: 1, end: 53 },
            { prefix: "Enemy_03C_", start: 1, end: 54 },
            { prefix: "Enemy_04Ca_", start: 1, end: 59 },
            { prefix: "Enemy_04Cb_", start: 1, end: 42 },
            { prefix: "Enemy_04Cc_", start: 1, end: 60 }
            ],
            D: [
            { prefix: "Enemy_01D_", start: 1, end: 51 },
            { prefix: "Enemy_02D_", start: 1, end: 53 },
            { prefix: "Enemy_03D_", start: 1, end: 53 },
            { prefix: "Enemy_04Da_", start: 1, end: 61 },
            { prefix: "Enemy_04Db_", start: 1, end: 29 },
            { prefix: "Enemy_04Dc_", start: 1, end: 60 }
            ],
            E: [
            { prefix: "Enemy_04Za_", start: 1, end: 61 },
            { prefix: "Enemy_04Zb_", start: 1, end: 29 },
            { prefix: "Enemy_04Zc_", start: 1, end: 40 }
            ],
            F: [
            { prefix: "Enemy_Ba_", start: 1, end: 68 },
            { prefix: "Enemy_Bb_", start: 1, end: 29 },
            { prefix: "Enemy_Bc_", start: 1, end: 29 }
            ]
            // 必要に応じてカテゴリを追加
        };

        if (!categoryPatterns[category]) return;

        const patterns = categoryPatterns[category];
        const allNames = [];
        patterns.forEach(p => {
            for (let i = p.start; i <= p.end; i++) {
                const num = String(i).padStart(3, "0");
                allNames.push(p.prefix + num);
            }
        });

        // 分割プリロード（負荷軽減）
        let index = 0;
        const batchSize = 50;
        const interval = 100;

        const preloadBatch = () => {
            const batch = allNames.slice(index, index + batchSize);
            batch.forEach(name => {
                const bitmap = Bitmap.loadPadPicture(name);
                bitmap.addLoadListener(() => console.log("プリロード完了: " + name));
            });
            index += batchSize;
            if (index < allNames.length) setTimeout(preloadBatch, interval);
        };

        preloadBatch();
    };

//===========================
// $gameScreen.showPicture オーバーライド
//===========================
const _Game_Screen_showPicture = Game_Screen.prototype.showPicture;
Game_Screen.prototype.showPicture = function(pictureId, name, origin, x, y, scaleX, scaleY, opacity, blendMode) {

    _Game_Screen_showPicture.call(this, pictureId, name, origin, x, y, scaleX, scaleY, opacity, blendMode);

    // name が null/undefined/非文字列でも安全！
    if (typeof name !== "string" || !name.startsWith("Enemy_")) {
        return;
    }

    const pic = this.picture(pictureId);
    if (!pic) return;

    const bitmap = Bitmap.loadPadPicture(name);
    pic._padBitmap = bitmap;

    const trySetSprite = () => {
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            const sprite = SceneManager._scene._spriteset._pictureContainer.children.find(s =>
                s.picture() && s.picture()._number === pictureId
            );
            if (sprite) {
                sprite.bitmap = bitmap;
                return true;
            }
        }
        return false;
    };

    bitmap.addLoadListener(function() {
        if (!trySetSprite()) {
            let retries = 10;
            const intervalId = setInterval(() => {
                if (trySetSprite() || retries <= 0) {
                    clearInterval(intervalId);
                }
                retries--;
            }, 100);
        }
    });
};

    //===========================
    // Sprite_Picture のロード差し替え
    //===========================
    const _Sprite_Picture_loadBitmap = Sprite_Picture.prototype.loadBitmap;
    Sprite_Picture.prototype.loadBitmap = function() {
        const pic = this.picture();
        if (pic && pic._padBitmap) {
            this.bitmap = pic._padBitmap;
            return;
        }
        _Sprite_Picture_loadBitmap.call(this);
    };

})();