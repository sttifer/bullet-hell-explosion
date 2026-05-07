import Player from './Player.js';
import Enemy from './Enemy.js';
import Bullet from './Bullet.js';
import UpgradeWindow from './UpgradeWindow.js';
import StarfieldBackground from './StarfieldBackground.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init() {
        // --- CAMINHOS DOS SPRITES ---
        this.playerSpritePath = 'assets/Player/playerShip1_blue.png';
        this.playerBulletPath = 'assets/Lasers/laserBlue03.png';
        this.enemyBulletPath = 'assets/Lasers/laserRed03.png';
        // Lista de naves inimigas (Frotas)
        this.enemyFleetPaths = ['assets/Enemies/enemyBlack1.png', 'assets/Enemies/enemyBlack2.png', 'assets/Enemies/enemyBlack3.png'];

        // Configurações Globais de Tamanho das Naves
        this.shipBaseSize = 32;     // Tamanho real da textura/desenho (pixels)
        this.shipScale = 0.8;       // Escala global (ajuste este valor para mudar o tamanho de todas as naves)
        this.playerHitboxScale = 0.5; // Escala do hitbox do jogador (0.5 = metade da nave)

        // Configurações de Espaçamento de Formação
        this.verticalSpacing = 160;  // Distância entre linhas de inimigos

        this.waveMovementSpeed = 1; // Multiplicador de velocidade dos padrões dos inimigos
        this.lives = 3;             // Vidas iniciais

        // Reset de Estado de Gameplay
        this.waveCount = 0;
        this.lastWaveTotalBullets = 0;
        this.waveIndex = -1;
        this.enemiesArrivedCount = 0;
        this.waveMovementStartTime = -1;
        this.currentWaveEnemyCount = 0;
        this.isUpgrading = false;
    }

    preload() {
        // Carrega Sprites principais
        this.load.image('player', this.playerSpritePath);
        this.load.image('playerBullet', this.playerBulletPath);
        this.load.image('enemyBullet', this.enemyBulletPath);

        // Carrega array de naves inimigas
        this.enemyFleetKeys = [];
        this.enemyFleetPaths.forEach((path, index) => {
            const key = `enemy_ship_${index}`;
            this.load.image(key, path);
            this.enemyFleetKeys.push(key);
        });

        // Textura de Coração (Ícone de Vida)
        const heartGraphics = this.make.graphics();
        heartGraphics.fillStyle(0xff0000);
        heartGraphics.fillCircle(8, 8, 8);
        heartGraphics.fillCircle(24, 8, 8);
        heartGraphics.fillTriangle(0, 12, 32, 12, 16, 32);
        heartGraphics.generateTexture('heart', 32, 32);
        heartGraphics.destroy();

        // Textura de Coração Preto (Vida Perdida)
        const blackHeartGraphics = this.make.graphics();
        blackHeartGraphics.fillStyle(0x000000);
        blackHeartGraphics.fillCircle(8, 8, 8);
        blackHeartGraphics.fillCircle(24, 8, 8);
        blackHeartGraphics.fillTriangle(0, 12, 32, 12, 16, 32);
        blackHeartGraphics.generateTexture('blackHeart', 32, 32);
        blackHeartGraphics.destroy();

        // Textura de Partícula (Quadradinho)
        const particleGraphics = this.make.graphics();
        particleGraphics.fillStyle(0xffffff);
        particleGraphics.fillRect(0, 0, 4, 4);
        particleGraphics.generateTexture('particle', 4, 4);
        particleGraphics.destroy();
    }

    create() {
        // Cria o fundo de estrelas
        this.starfield = new StarfieldBackground(this, {
            starDensity: 150, starSlowSpeed: 0.5, starMediumSpeed: 1.2, starFastSpeed: 2.5,
            scaleSlow: 1, scaleMedium: 1.2, scaleFast: 1.5,
            alphaSlow: 0.3, alphaMedium: 0.5, alphaFast: 0.8
        });
        this.starfield.create();

        this.playerBullets = this.physics.add.group({ classType: Bullet, defaultKey: 'playerBullet', runChildUpdate: true });
        this.enemyBullets = this.physics.add.group({ classType: Bullet, defaultKey: 'enemyBullet', runChildUpdate: true });
        this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true });

        this.score = 0;
        this.waveText = this.add.text(20, 20, 'Onda: 0', { fontSize: '32px', fill: '#fff' }).setDepth(100);

        // Grupo de Corações para a Interface
        this.heartsGroup = this.add.group().setDepth(100);
        this.updateLivesUI();

        // Emissor para faíscas de impacto (pequenas e rápidas)
        this.hitParticles = this.add.particles(0, 0, 'particle', {
            speed: { min: 50, max: 150 },
            scale: { start: 1, end: 0 },
            lifespan: 200,
            tint: 0xffa500, // Laranja
            emitting: false
        });

        // Emissor para explosão de morte (maior e dura um pouco mais)
        this.deathParticles = this.add.particles(0, 0, 'particle', {
            speed: { min: 100, max: 250 },
            scale: { start: 3, end: 0 },
            lifespan: 400,
            tint: 0xff4500, // Laranja avermelhado
            emitting: false
        });

        this.player = new Player(this, this.scale.width / 2, this.scale.height * 0.8);
        this.cursors = this.input.keyboard.createCursorKeys();

        this.patterns = [
            { type: 'V-Shape', count: 5 },
            { type: 'Circle', count: 8 },
            { type: 'Wall', count: 10 },
            { type: 'X-Cross', count: 9 },
            { type: 'Diamond', count: 8 },
            { type: 'Double-Line', count: 12 },
            { type: 'Columns', count: 8 },
            { type: 'Arrow', count: 7 },
            { type: 'Grid', count: 9 }
        ];

        // Mapeamento de padrões de tiro por nível de complexidade
        this.shotPatternsByDifficulty = [
            [0, 1, 2, 4, 7], // Nível 0: Simples
            [3, 6, 8, 9],    // Nível 1: Intermediário
            [5]              // Nível 2: Complexo (Círculos massivos)
        ];

        this.setupCollisions();
        this.spawnNextWave();
    }

    setupCollisions() {
        // Colisão com Balas Inimigas
        this.physics.add.overlap(this.player, this.enemyBullets, (player, bullet) => {
            bullet.destroy();
            this.loseLife();
        });

        // Colisão com Inimigos
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            // Só processa colisão se o inimigo não estiver mais na animação de entrada
            if (enemy.isInvulnerable) return;

            enemy.takeDamage();
            this.loseLife();
        });

        this.physics.add.overlap(this.playerBullets, this.enemies, (bullet, enemy) => {
            // Faíscas no ponto de impacto da bala
            this.hitParticles.explode(5, bullet.x, bullet.y);
            bullet.destroy();
            enemy.takeDamage();
        });
    }

    loseLife() {
        if (this.player.isDamageInvulnerable || this.player.isWaveInvulnerable) return;

        this.lives--;
        this.updateLivesUI();
        
        if (this.lives <= 0) {
            this.scene.start('GameOverScene', { wave: this.waveCount });
        } else {
            this.player.setDamageInvulnerable(2000); // 2 segundos de invencibilidade
        }
    }

    updateLivesUI() {
        this.heartsGroup.clear(true, true);
        const maxLives = 3;
        for (let i = 0; i < maxLives; i++) {
            const texture = (i < this.lives) ? 'heart' : 'blackHeart';
            this.heartsGroup.create(this.scale.width - 40 - (i * 40), 40, texture);
        }
    }

    addScore(amount) {
        this.score += amount;
    }

    update(time, delta) {
        if (this.isUpgrading) return;

        this.starfield.update();

        this.player.update(time, this.cursors);
        
        // Verifica se todos os inimigos da wave atual chegaram e inicia o movimento
        if (this.enemiesArrivedCount === this.currentWaveEnemyCount && this.waveMovementStartTime === -1 && this.currentWaveEnemyCount > 0) {
            this.waveMovementStartTime = time; // Define o tempo de início do movimento para toda a wave
            this.player.setWaveInvulnerable(false); // Jogador deixa de ser invulnerável
            this.enemies.getChildren().forEach(enemy => {
                enemy.startPatternMovement(time); // Sinaliza cada inimigo para começar seu padrão
            });
        }

        // Só limpa a onda se ela já tiver começado (waveMovementStartTime != -1) e não houver inimigos vivos
        if (this.enemies.countActive() === 0 && this.waveMovementStartTime !== -1) {
            this.handleWaveClear();
        }
    }

    enemyArrived() { this.enemiesArrivedCount++; } // Chamado pelo inimigo quando ele chega

    getBulletsPerEnemy(pattern, density) {
        switch (pattern) {
            case 0: return 8 * density;
            case 1: return density;
            case 2: return 2 * density + 1;
            case 3: return 4 * density;
            case 4: return 2 * density;
            case 5: return 8 * density + 8;
            case 6: return 5 * density;
            case 7: return 2 * density;
            case 8: return density;
            case 9: return 4 * density;
            default: return 1;
        }
    }

    handleWaveClear() {
        if (this.isUpgrading) return;
        
        this.isUpgrading = true;
        this.physics.pause();

        // Limpa todas as balas da tela ao finalizar a onda
        this.playerBullets.clear(true, true);
        this.enemyBullets.clear(true, true);

        // Cria a janela de upgrade
        const upgradeWin = new UpgradeWindow(this, (choice) => {
            this.applyUpgrade(choice);
            this.isUpgrading = false;
            this.physics.resume();
            this.spawnNextWave();
        });
        
        upgradeWin.show();
    }

    applyUpgrade(id) {
        if (id === 'speed') {
            this.player.speed = Math.min(this.player.speed + 25, 600);
        } else if (id === 'fireRate') {
            // Diminuir o fireRate torna o tiro mais rápido
            this.player.fireRate = Math.max(this.player.fireRate * 0.85, 80);
        } else if (id === 'multiShot') {
            this.player.bulletCount = Math.min(this.player.bulletCount + 1, 7);
        } else if (id === 'extraLife') {
            this.lives = Math.min(this.lives + 1, 3); // Máximo de 3 vidas
            this.updateLivesUI();
        }
    }

    spawnNextWave() {
        this.waveCount++;
        
        // Cálculo de velocidade não linear: aumenta rápido no início e suaviza depois
        // Ex: Onda 1 = 1x | Onda 4 = 1.2x | Onda 9 = 1.4x | Onda 25 = 1.8x
        this.waveMovementSpeed = 1 + (Math.sqrt(this.waveCount) - 1) * 0.2;

        this.player.setWaveInvulnerable(true); // Jogador se torna invulnerável no início da nova onda
        this.waveText.setText(`Onda: ${this.waveCount}`);
        this.waveIndex = (this.waveIndex + 1) % this.patterns.length;
        
        // --- PADRÃO DE PROGRESSÃO ---
        
        // 1. Quantidade de Balas (Desafio cumulativo)
        // Começa com 3 na Wave 1 e aumenta +3 por onda
        let targetTotalBullets = 3 + (this.waveCount - 1) * 3;
        
        const { type } = this.patterns[this.waveIndex];
        
        // 2. Complexidade do Padrão (Sobe a cada 3 ondas)
        const currentMaxDifficulty = Math.min(Math.floor((this.waveCount - 1) / 3), 2);

        let availableShotPatterns = [];
        for (let i = 0; i <= currentMaxDifficulty; i++) {
            availableShotPatterns = availableShotPatterns.concat(this.shotPatternsByDifficulty[i]);
        }

        const waveFleetSprite = Phaser.Math.RND.pick(this.enemyFleetKeys);
        let bestPattern = Phaser.Math.RND.pick(availableShotPatterns);
        
        // 3. Densidade de Balas (Sobe a cada 4 ondas, limitado a 3)
        let bestDensity = Math.min(1 + Math.floor((this.waveCount - 1) / 4), 3);
        
        const bpe = this.getBulletsPerEnemy(bestPattern, bestDensity);
        let finalCount = Math.ceil(targetTotalBullets / bpe);
        
        if (finalCount > 12) {
            finalCount = 12;
            if (bestDensity < 3) bestDensity++;
        }

        this.currentWaveEnemyCount = finalCount; // Armazena a contagem para esta wave
        this.enemiesArrivedCount = 0; // Reseta o contador para a nova wave
        this.waveMovementStartTime = -1; // Reseta o tempo de início do movimento
        // Define o tipo de movimento baseado na formação
        let movementType = 'none';
        if (type === 'Circle' || type === 'Diamond') movementType = 'circle';
        else movementType = 'sine';

        // Recalcula o spacing baseado no número real de inimigos (finalCount)
        const spacing = this.scale.width / (finalCount + 1);
        this.lastWaveTotalBullets = finalCount * this.getBulletsPerEnemy(bestPattern, bestDensity);

        // Sorteia se a onda terá movimento sincronizado ou alternado (50% de chance para cada)
        const isAlternating = Phaser.Math.RND.between(0, 1) === 1;

        // Lógica de Compensação: Menos inimigos = Mais vida
        // Base: 15 HP total por wave + progressão por waveCount
        const waveHPBudget = 12 + (this.waveCount * 2);
        const enemyHP = Math.max(3, Math.ceil(waveHPBudget / finalCount));

        const enemyConfigs = [];
        let maxTravelDuration = 0;

        for (let i = 0; i < finalCount; i++) {
            const cols = Math.ceil(Math.sqrt(finalCount)); // Necessário para o cálculo de Grid
            let tx, ty;
            let movementMultiplier = 1;
            const centerOffset = Math.floor(finalCount / 2);

            if (type === 'V-Shape') {
                tx = spacing * (i + 1);
                ty = 200 + (Math.abs(centerOffset - i) * (this.verticalSpacing * 0.4));
            } else if (type === 'Circle') {
                const angle = (i / finalCount) * Math.PI * 2;
                tx = (this.scale.width/2) + Math.cos(angle) * 200;
                ty = 300 + Math.sin(angle) * 200;
            } else if (type === 'Wall') {
                tx = spacing * (i + 1);
                ty = 100 + (i % 2 * this.verticalSpacing);
            } else if (type === 'X-Cross') {
                tx = (i < finalCount/2) ? spacing * (i+1) : spacing * (finalCount-i);
                ty = 100 + (i * (this.verticalSpacing * 0.4));
            } else if (type === 'Diamond') {
                const angle = (i / finalCount) * Math.PI * 2;
                tx = (this.scale.width/2) + Math.cos(angle) * 250;
                ty = 350 + Math.sin(angle) * 350;
            } else if (type === 'Double-Line') {
                tx = (i % Math.ceil(finalCount/2) + 1) * (this.scale.width / (Math.ceil(finalCount/2) + 1));
                ty = (i < finalCount/2) ? this.verticalSpacing : this.verticalSpacing * 2;
            } else if (type === 'Columns') {
                tx = (i % 2 === 0) ? this.scale.width * 0.25 : this.scale.width * 0.75;
                ty = 100 + (Math.floor(i/2) * this.verticalSpacing);
            } else if (type === 'Arrow') {
                tx = (this.scale.width / 2) + ((i - centerOffset) * 80);
                ty = 400 - (Math.abs(i - centerOffset) * (this.verticalSpacing * 0.5));
            } else { // Grid
                tx = (i % cols + 1) * (this.scale.width / (cols + 1));
                ty = (Math.floor(i / cols) + 1) * this.verticalSpacing;
            }

            // Se for alternado, define a direção baseada na linha ou coluna
            if (isAlternating && movementType === 'sine') {
                if (type === 'Columns') {
                    movementMultiplier = (i % 2 === 0) ? 1 : -1;
                } else if (type === 'Double-Line' || type === 'Wall') {
                    const row = (type === 'Double-Line') ? (i < finalCount / 2 ? 0 : 1) : (i % 2);
                    movementMultiplier = (row === 0) ? 1 : -1;
                } else if (type === 'Grid') {
                    const row = Math.floor(i / cols);
                    movementMultiplier = (row % 2 === 0) ? 1 : -1;
                } else {
                    // Para outros casos, alterna por índice
                    movementMultiplier = (i % 2 === 0) ? 1 : -1;
                }
            }

            const startX = this.scale.width / 2;
            const startY = -100 - (i * 80);
            const dist = Phaser.Math.Distance.Between(startX, startY, tx, ty);
            const duration = (dist / 200) * 1000;
            if (duration > maxTravelDuration) maxTravelDuration = duration;

            enemyConfigs.push({ startX, startY, tx, ty, index: i, movementMultiplier });
        }

        // Cria os inimigos passando a duração máxima para que todos cheguem juntos
        enemyConfigs.forEach(cfg => {
            this.enemies.add(new Enemy(this, cfg.startX, cfg.startY, cfg.tx, cfg.ty, bestPattern, bestDensity, movementType, cfg.index * 0.2, enemyHP, waveFleetSprite, maxTravelDuration, cfg.movementMultiplier));
        });
    }
}