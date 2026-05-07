import TitleScene from './TitleScene.js';
import GameScene from './GameScene.js';
import GameOverScene from './GameOverScene.js';

const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 720,
        height: 1280,
        orientation: Phaser.Scale.PORTRAIT
    },
    scene: [TitleScene, GameScene, GameOverScene]
};
new Phaser.Game(config);
