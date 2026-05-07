import StarfieldBackground from './StarfieldBackground.js';

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    init() {
        // --- CONFIGURAÇÃO DE ÁUDIO ---
        this.titleMusicPath = 'assets/BGM/title_theme.mp3'; 
        this.clickSoundPath = 'assets/SE/confirm.wav';
        this.damageSoundPath = 'assets/SE/damage.wav'; // Variável para o som de dano
        // -----------------------------

        // Inicializa os estados globais de áudio se não existirem
        if (this.game.registry.get('musicEnabled') === undefined) this.game.registry.set('musicEnabled', true);
        if (this.game.registry.get('sfxEnabled') === undefined) this.game.registry.set('sfxEnabled', true);
    }

    preload() {
        // Preload do fundo de estrelas
        StarfieldBackground.preload(this);
        // Carrega o sprite do jogador para exibir na tela de título
        this.load.image('player', 'assets/Player/playerShip1_blue.png');
        // Carrega o arquivo de áudio
        this.load.audio('titleMusic', this.titleMusicPath);
        // Carrega o som de clique
        this.load.audio('click', this.clickSoundPath);

        // --- GERAÇÃO DOS ÍCONES PROGRAMATICAMENTE (MAIORES - 48px) ---
        const graphics = this.make.graphics();

        // 1. Ícone de Música Ligada (Nota Musical)
        graphics.clear();
        graphics.fillStyle(0x00ffff);
        graphics.fillCircle(18, 33, 9);  // Cabeça da nota
        graphics.fillRect(23, 9, 4, 24); // Haste
        graphics.fillRect(23, 9, 15, 6); // Bandeira
        graphics.generateTexture('musicOn', 48, 48);

        // 2. Ícone de Música Desligada (Nota + Barra Vermelha)
        graphics.clear();
        graphics.fillStyle(0x888888);
        graphics.fillCircle(18, 33, 9);
        graphics.fillRect(23, 9, 4, 24);
        graphics.fillRect(23, 9, 15, 6);
        graphics.lineStyle(4, 0xff0000);
        graphics.lineBetween(6, 6, 42, 42); // Barra de proibido
        graphics.generateTexture('musicOff', 48, 48);

        // 3. Ícone de SFX Ligado (Alto-falante)
        graphics.clear();
        graphics.fillStyle(0x00ff00);
        graphics.fillRect(9, 16, 12, 16); // Base do alto-falante
        // Triângulo para a frente do alto-falante
        graphics.fillTriangle(21, 24, 39, 8, 39, 40);
        graphics.generateTexture('sfxOn', 48, 48);

        // 4. Ícone de SFX Desligado (Alto-falante + Barra Vermelha)
        graphics.clear();
        graphics.fillStyle(0x888888);
        graphics.fillRect(9, 16, 12, 16);
        graphics.fillTriangle(21, 24, 39, 8, 39, 40);
        graphics.lineStyle(4, 0xff0000);
        graphics.lineBetween(6, 6, 42, 42);
        graphics.generateTexture('sfxOff', 48, 48);

        graphics.destroy();
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

        // Botão de Iniciar Jogo (Central)
        const startBtn = this.add.container(width / 2, height * 0.75);
        const btnBg = this.add.rectangle(0, 0, 320, 80, 0x00ffff, 0.2).setStrokeStyle(2, 0x00ffff);
        const btnText = this.add.text(0, 0, 'INICIAR JOGO', { fontSize: '32px', fill: '#fff', fontWeight: 'bold' }).setOrigin(0.5);
        startBtn.add([btnBg, btnText]);
        startBtn.setSize(320, 80).setInteractive({ useHandCursor: true });

        startBtn.on('pointerover', () => btnBg.setFillStyle(0x00ffff, 0.4));
        startBtn.on('pointerout', () => btnBg.setFillStyle(0x00ffff, 0.2));
        startBtn.on('pointerdown', () => {
            if (this.game.registry.get('sfxEnabled')) this.sound.play('click');
            this.titleMusic.stop();
            this.scene.start('GameScene');
        });

        // Botões de Toggle (Inferiores)
        const toggleY = height * 0.9;
        
        // Controle de Música
        const musicBtn = this.add.image(width / 2 - 80, toggleY, this.game.registry.get('musicEnabled') ? 'musicOn' : 'musicOff')
            .setInteractive({ useHandCursor: true });

        musicBtn.on('pointerdown', () => {
            const newState = !this.game.registry.get('musicEnabled');
            this.game.registry.set('musicEnabled', newState);
            musicBtn.setTexture(newState ? 'musicOn' : 'musicOff');
            this.titleMusic.setMute(!newState);
            if (this.game.registry.get('sfxEnabled')) this.sound.play('click');
        });

        // Controle de SFX
        const sfxBtn = this.add.image(width / 2 + 80, toggleY, this.game.registry.get('sfxEnabled') ? 'sfxOn' : 'sfxOff')
            .setInteractive({ useHandCursor: true });

        sfxBtn.on('pointerdown', () => {
            const newState = !this.game.registry.get('sfxEnabled');
            this.game.registry.set('sfxEnabled', newState);
            sfxBtn.setTexture(newState ? 'sfxOn' : 'sfxOff');
            if (newState) this.sound.play('click');
        });
        
        // Inicializa a música respeitando o estado salvo
        this.titleMusic = this.sound.add('titleMusic', { loop: true, volume: 0.2 }); // Volume reduzido
        this.titleMusic.setMute(!this.game.registry.get('musicEnabled'));
        this.titleMusic.play();
    }

    update() {
        this.starfield.update();
    }
}