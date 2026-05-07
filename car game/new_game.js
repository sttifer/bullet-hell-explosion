/**
 * Jogo de Corrida Top-Down - Mobile Portrait
 */

class TitleScene extends Phaser.Scene {
    constructor() { super('TitleScene'); }
    create() {
        this.add.text(360, 400, 'CAR RACE', { fontSize: '64px', fill: '#0f0' }).setOrigin(0.5);
        this.add.text(360, 800, 'Toque para Iniciar', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        this.input.once('pointerdown', () => this.scene.start('GameScene'));
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    init() {
        // --- CONFIGURAÇÕES DE TESTE (Fácil para trocar) ---
        this.roadSpeed = 0.5;      // Velocidade de profundidade (0 a 1)
        this.playerSpeed = 400;    // Velocidade de movimento do jogador
        this.spawnInterval = 1000; // Intervalo entre novos carros (ms)
        this.npcSlowSpeed = 0.2;   // Velocidade de aproximação lenta
        this.npcFastSpeed = 0.6;   // Velocidade de aproximação rápida
        this.horizonY = 450;       // Linha do horizonte
        this.vanishingX = 360;     // Ponto de fuga central
        // --------------------------------------------------

        this.player = null;
        this.cursors = null;
        this.score = 0;
        this.obstacles = null; // Grupo para os carros inimigos
        this.lastObstacleSpawnTime = 0;
        this.obstacleSpawnInterval = this.spawnInterval; 
        this.distance = 0;         // Pontuação baseada em distância
        this.roadElements = null; // Elementos que se movem (faixas, postes)
        this.roadGraphics = null;  // Desenho da pista
    }

    preload() { } // Não precisamos carregar imagens

    create() {
        this.startTime = this.time.now; // Inicia o contador de tempo
        // Sincroniza o timer de spawn com o início da cena
        this.lastObstacleSpawnTime = this.time.now;

        // 1. Desenha o cenário estático
        this.add.rectangle(0, 0, 720, 1280, 0x228b22).setOrigin(0);
        
        // Desenho da pista em perspectiva (Trapézio)
        this.roadGraphics = this.add.graphics();
        this.drawPerspectiveRoad();

        // 2. Elementos móveis do cenário (Faixas e Postes)
        this.roadElements = this.add.group();

        // Inicializa faixas com uma propriedade 'z' (profundidade de 0 a 1)
        for (let i = 0; i < 5; i++) {
            let stripe = this.add.rectangle(0, 0, 20, 10, 0xffffff);
            stripe.setData('z', i * 0.2);
            this.roadElements.add(stripe);
            
            let postL = this.add.rectangle(0, 0, 40, 120, 0x111111);
            postL.setData('z', i * 0.2);
            postL.setData('side', -1);
            this.roadElements.add(postL);

            let postR = this.add.rectangle(0, 0, 40, 120, 0x111111);
            postR.setData('z', i * 0.2);
            postR.setData('side', 1);
            this.roadElements.add(postR);
        }

        // Carro do jogador
        this.player = this.add.rectangle(360, 1150, 100, 100, 0x0000ff);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true); 
        this.player.body.setImmovable(true); // O carro do jogador não é empurrado

        // Grupo para os carros inimigos
        this.obstacles = this.physics.add.group();

        // Configura controles de teclado
        this.cursors = this.input.keyboard.createCursorKeys();

        // UI para pontuação
        this.scoreText = this.add.text(20, 20, 'Tempo: 00:00.000', { fontSize: '28px', fill: '#fff' });
        this.scoreText.setDepth(10); // Garante que o texto fique acima de tudo

        // Adiciona colisor entre o jogador e os obstáculos
        this.physics.add.overlap(this.player, this.obstacles, this.hitCar, null, this);
    }

    update(time, delta) {
        // Lógica de Boost (Espaço)
        const isBoosting = this.cursors.space.isDown;
        const currentSpeedFactor = isBoosting ? 2 : 1;
        const speedStep = this.roadSpeed * currentSpeedFactor * (delta / 1000);
        const currentPlayerSpeed = isBoosting ? this.playerSpeed * 1.5 : this.playerSpeed;

        // Colisão com a "parede" (limites da pista em perspectiva no Z do jogador)
        // No Z do jogador (aprox 0.9), a pista tem largura total.
        if (this.player.x < 120 || this.player.x > 600) {
            this.hitCar();
        }

        // Movimenta elementos da estrada para simular velocidade
        this.roadElements.children.each(item => {
            let z = item.getData('z') + speedStep;
            if (z > 1) z -= 1;
            item.setData('z', z);
            
            // Projeção de Perspectiva
            const p = this.getPerspective(z, item.getData('side') || 0);
            item.setPosition(p.x, p.y);
            item.setScale(p.scale * (item.getData('side') ? 2 : 1));
            item.setVisible(p.y > this.horizonY);
        });

        // Movimento do jogador
        this.player.body.setVelocity(0);
        
        if (this.cursors.left.isDown) {
            this.player.body.setVelocityX(-currentPlayerSpeed);
        } else if (this.cursors.right.isDown) {
            this.player.body.setVelocityX(currentPlayerSpeed);
        }

        if (this.cursors.up.isDown) this.player.body.setVelocityY(-currentPlayerSpeed);
        else if (this.cursors.down.isDown) this.player.body.setVelocityY(currentPlayerSpeed);

        // Atualiza a pontuação (Distância baseada na velocidade)
        this.distance += (this.roadSpeed * 1000 * currentSpeedFactor / 1000) * delta;
        const displayDist = Math.floor(this.distance);
        this.scoreText.setText(`KM: ${(displayDist/1000).toFixed(3)}`);
        this.score = displayDist;

        // Spawn de carros inimigos
        if (time > this.lastObstacleSpawnTime + this.obstacleSpawnInterval) {
            this.spawnObstacleCar();
            this.lastObstacleSpawnTime = time;
            // Aumenta a dificuldade diminuindo o intervalo de spawn
            if (this.obstacleSpawnInterval > 300) {
                this.obstacleSpawnInterval -= 10;
            }
        }

        // Ajusta a velocidade dos carros inimigos existentes se houver boost
        this.obstacles.getChildren().forEach(car => {
            let z = car.getData('z');
            let speed = car.getData('type') === 'slow' ? this.npcSlowSpeed : -this.npcFastSpeed;
            
            z += (speed + (this.roadSpeed * currentSpeedFactor)) * (delta / 1000);
            car.setData('z', z);

            const p = this.getPerspective(z, car.getData('lane'));
            car.setPosition(p.x, p.y);
            car.setScale(p.scale * 2.5); // Aumenta um pouco o tamanho dos carros
            
            // Lógica de colisão manual (já que escala e posição X mudam fora da física tradicional)
            if (z > 0.85 && z < 0.95 && Math.abs(car.x - this.player.x) < 60) {
                this.hitCar();
            }
        });

        // Remove carros inimigos que saem da tela
        this.obstacles.getChildren().forEach(car => {
            const z = car.getData('z');
            if (z < -0.5 || z > 1.5) { 
                car.destroy();
            }
        });
    }

    drawPerspectiveRoad() {
        this.roadGraphics.clear();
        this.roadGraphics.fillStyle(0x444444, 1);
        // Desenha o trapézio da pista
        this.roadGraphics.beginPath();
        this.roadGraphics.moveTo(350, this.horizonY);  // Topo esquerdo (horizonte)
        this.roadGraphics.lineTo(370, this.horizonY);  // Topo direito
        this.roadGraphics.lineTo(720, 1280);           // Base direita
        this.roadGraphics.lineTo(0, 1280);             // Base esquerda
        this.roadGraphics.closePath();
        this.roadGraphics.fillPath();
    }

    getPerspective(z, laneOffset) {
        // z: 0 (horizonte) a 1 (base da tela)
        // laneOffset: -1 (esquerda), 0 (centro), 1 (direita)
        const scale = Math.pow(z, 2); // Curva exponencial para profundidade
        const x = this.vanishingX + (laneOffset * 250 * z);
        const y = this.horizonY + (z * (1280 - this.horizonY));
        return { x, y, scale };
    }

    spawnObstacleCar() {
        const lanes = [-0.6, 0, 0.6]; // Offsets laterais
        const randomLane = Phaser.Math.RND.pick(lanes);
        const isFastCar = Phaser.Math.RND.frac() < 0.1; // 10% de chance (Mais raro)
        const startZ = isFastCar ? 1.5 : 0;

        const color = isFastCar ? 0xffff00 : 0xff0000; // Amarelo p/ rápido, Vermelho p/ lento
        
        let car;
        car = this.add.rectangle(0, 0, 80, 60, color);
        car.setData('z', startZ);
        car.setData('lane', randomLane);
        car.setData('type', isFastCar ? 'fast' : 'slow');
        
        this.obstacles.add(car);
    }

    hitCar(player, car) {
        // Game Over
        this.scene.start('GameOverScene', { score: this.score });
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
    init(data) {
        this.finalScore = data.score || 0;
        this.highScore = parseInt(localStorage.getItem('car_race_highscore')) || 0;
    }
    create() {
        // Atualiza o high score se a pontuação atual for maior
        if (this.finalScore > this.highScore) {
            localStorage.setItem('car_race_highscore', this.finalScore);
            this.highScore = this.finalScore; // Atualiza para exibição
        }

        const minutes = Math.floor(this.finalScore / 60000);
        const seconds = Math.floor((this.finalScore % 60000) / 1000);
        const milliseconds = Math.floor(this.finalScore % 1000);
        const formattedScore = `Km: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;

        const highMinutes = Math.floor(this.highScore / 60000);
        const highSeconds = Math.floor((this.highScore % 60000) / 1000);
        const highMilliseconds = Math.floor(this.highScore % 1000);
        const formattedHighScore = `Km: ${highMinutes.toString().padStart(2, '0')}:${highSeconds.toString().padStart(2, '0')}.${highMilliseconds.toString().padStart(3, '0')}`;

        this.add.text(360, 400, 'FIM DE JOGO', { fontSize: '64px', fill: '#f00' }).setOrigin(0.5);
        this.add.text(360, 600, `Seu Tempo: ${formattedScore}`, { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
        this.add.text(360, 700, `Melhor Tempo: ${formattedHighScore}`, { fontSize: '32px', fill: '#0f0' }).setOrigin(0.5);
        this.add.text(360, 900, 'Toque para Reiniciar', { fontSize: '32px', fill: '#aaa' }).setOrigin(0.5);
        this.input.once('pointerdown', () => this.scene.start('TitleScene'));
    }
}

const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    backgroundColor: '#333', // Cor de fundo para a área fora da estrada
    physics: {
        default: 'arcade',
        arcade: {
            debug: false // Mude para true para ver os corpos de colisão
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        orientation: Phaser.Scale.PORTRAIT
    },
    scene: [TitleScene, GameScene, GameOverScene]
};

new Phaser.Game(config);