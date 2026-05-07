import StarfieldBackground from './StarfieldBackground.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.finalWave = data.wave || 0;
        this.maxWave = parseInt(localStorage.getItem('bullet_hell_maxwave')) || 0;
        
        if (this.finalWave > this.maxWave) {
            localStorage.setItem('bullet_hell_maxwave', this.finalWave);
            this.maxWave = this.finalWave;
        }
    }

    preload() {
        // Preload do fundo de estrelas
        StarfieldBackground.preload(this);
        // Carrega o sprite do jogador
        this.load.image('player', 'assets/Player/playerShip1_blue.png');
    }

    create() {
        const { width, height } = this.scale;

        // Fundo espacial calmo para a derrota
        this.starfield = new StarfieldBackground(this, {
            starDensity: 40,
            starSlowSpeed: 0.1,
            starMediumSpeed: 0.2,
            starFastSpeed: 0.4,
            alphaSlow: 0.1, alphaMedium: 0.2, alphaFast: 0.3
        });
        this.starfield.create();

        // Título GAME OVER com Neon Vermelho
        this.add.text(width / 2, height * 0.3, 'GAME OVER', {
            fontFamily: 'Arial Black',
            fontSize: '80px',
            color: '#ff0000',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 10,
            shadow: { offsetX: 0, offsetY: 0, color: '#ff0000', blur: 25, stroke: true, fill: true }
        }).setOrigin(0.5);

        // Exibe a nave do jogador escurecida e girando lentamente (vencida)
        const gameScene = this.game.scene.getScene('GameScene');
        const ship = this.add.image(width / 2, height * 0.5, 'player')
            .setScale(gameScene.shipScale * 1.5)
            .setTint(0x555555)
            .setAlpha(0.7);
        
        this.tweens.add({
            targets: ship,
            angle: 360,
            duration: 25000,
            repeat: -1
        });

        // Estatísticas estilizadas
        this.add.text(width / 2, height * 0.65, `Onda Alcançada: ${this.finalWave}`, { 
            fontSize: '32px', fill: '#ffffff', fontFamily: 'Arial' 
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.71, `Melhor Marca: ${this.maxWave}`, { 
            fontSize: '28px', fill: '#00ff00', fontFamily: 'Arial' 
        }).setOrigin(0.5);

        // Texto de reinício com efeito pulse
        const restartText = this.add.text(width / 2, height * 0.85, 'Toque para Reiniciar', { 
            fontSize: '26px', fill: '#888888', fontFamily: 'Arial' 
        }).setOrigin(0.5);

        this.tweens.add({ targets: restartText, alpha: 0.4, duration: 1000, yoyo: true, repeat: -1 });
        
        this.input.on('pointerdown', () => this.scene.start('TitleScene'));
    }

    update() {
        if (this.starfield) this.starfield.update();
    }
}