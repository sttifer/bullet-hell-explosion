import StarfieldBackground from './StarfieldBackground.js';

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    preload() {
        // Preload do fundo de estrelas
        StarfieldBackground.preload(this);
        // Carrega o sprite do jogador para exibir na tela de título
        this.load.image('player', 'assets/Player/playerShip1_blue.png');
    }

    create() {
        const { width, height } = this.scale;

        // Cria o fundo de estrelas com menos densidade para a tela de título
        this.starfield = new StarfieldBackground(this, {
            starDensity: 50, // Menos estrelas
            starSlowSpeed: 0.2,
            starMediumSpeed: 0.5,
            starFastSpeed: 1.0,
            scaleSlow: 0.8, scaleMedium: 1, scaleFast: 1.2,
            alphaSlow: 0.2, alphaMedium: 0.4, alphaFast: 0.6
        });
        this.starfield.create();

        // Título do Jogo com efeito neon
        this.add.text(width / 2, height * 0.35, 'BULLET HELL\nEXPLOSION', {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#00ffff', // Ciano
            align: 'center',
            stroke: '#000000',
            strokeThickness: 8,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#00ffff',
                blur: 15,
                stroke: true,
                fill: true
            }
        }).setOrigin(0.5);

        // Nave do jogador
        const gameScene = this.game.scene.getScene('GameScene');
        this.add.image(width / 2, height * 0.6, 'player').setScale(gameScene.shipScale * 1.5);

        // Texto "Toque para Iniciar"
        this.add.text(width / 2, height * 0.8, 'Toque para Iniciar', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        
        this.input.once('pointerdown', () => this.scene.start('GameScene'));
    }

    update() {
        this.starfield.update();
    }
}