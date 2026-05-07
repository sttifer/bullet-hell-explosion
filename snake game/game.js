/**
 * Jogo da Cobrinha - Mobile Portrait
 */

class TitleScene extends Phaser.Scene {
    constructor() { super('TitleScene'); }
    create() {
        // Inicia o contexto de áudio do Tone.js na primeira interação do usuário
        this.input.once('pointerdown', () => {
            Tone.start();
            this.scene.start('GameScene');
        });
        this.add.text(360, 400, 'SNAKE MOBILE', { fontSize: '64px', fill: '#0f0' }).setOrigin(0.5);
        this.add.text(360, 800, 'Toque para Iniciar', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    init(data) {
        this.snake = [];
        this.food = null;
        this.direction = 'right'; // Direção atual da cobra
        this.tileSize = 40;
        this.lastMoveTime = 0;
        this.moveInterval = 150;

        this.score = 0;
        this.directionBuffer = []; // Fila para armazenar os comandos de direção
        this.maxBufferLength = 3; // Capacidade máxima do buffer
        // Recupera o recorde do navegador
        this.highScore = parseInt(localStorage.getItem('snake_highscore')) || 0;

        // Inicializa os sintetizadores Tone.js
        this.initAudio();

    }

    create() {
        // Grid de fundo para ajudar na visualização (opcional)
        // this.add.grid(360, 640, 720, 1280, 40, 40, 0x222222).setAltFillStyle(0x2d2d2d);
        
        // Sincroniza o timer de movimento com o tempo atual do motor
        this.lastMoveTime = this.time.now;
        
        // Configura controles de teclado
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D');

        // UI
        this.uiText = this.add.text(20, 20, `Score: ${this.score}  Recorde: ${this.highScore}`, { fontSize: '28px', fill: '#fff' });

        // Inicializa a cobra com 3 segmentos
        for (let i = 0; i < 3; i++) {
            this.snake.push(this.add.rectangle(160 - (i * 40), 160, 38, 38, 0x00ff00).setOrigin(0));
        }

        this.spawnFood();

        // Controles por toque - Divide a tela em 4 áreas
        this.input.on('pointerdown', (pointer) => {
            const centerX = 360;
            const centerY = 640; // Centro da tela
            const dx = pointer.x - centerX;
            const dy = pointer.y - centerY;

            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) this.queueDirection('right');
                else if (dx < 0) this.queueDirection('left');
            } else {
                if (dy > 0) this.queueDirection('down');
                else if (dy < 0) this.queueDirection('up');
            }
        });
    }

    initAudio() {
        // Synth para comer a maçã (som de "coleta")
        this.eatSynth = new Tone.Synth({
            oscillator: { type: "triangle" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.1 }
        }).toDestination();

        // Synth para a morte (som de "game over" ou impacto)
        this.deathSynth = new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.001, decay: 0.5, sustain: 0.01, release: 0.5 }
        }).toDestination();

        // Adiciona um filtro para o som de morte para deixá-lo mais "grave"
        this.deathFilter = new Tone.Filter(400, "lowpass").toDestination();
        this.deathSynth.connect(this.deathFilter);
    }


    update(time) {
        // Mecânica de Correr (Espaço)
        const isRunning = this.cursors.space.isDown;
        const currentInterval = isRunning ? this.moveInterval / 2 : this.moveInterval; // Aumenta a velocidade ao correr

        // Leitura do Teclado
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.A)) {
            this.queueDirection('left');
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.D)) {
            this.queueDirection('right');
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W)) {
            this.queueDirection('up');
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keys.S)) {
            this.queueDirection('down');
        }

        // Movimentação baseada no tempo
        if (time >= this.lastMoveTime + currentInterval) {
            this.moveSnake();
            this.lastMoveTime = time;
        }
    }

    // Adiciona uma direção ao buffer, respeitando a capacidade e evitando viradas de 180 graus
    queueDirection(newDir) {
        // Pega a última direção no buffer ou a direção atual da cobra se o buffer estiver vazio
        const lastBufferedDir = this.directionBuffer.length > 0 ? this.directionBuffer[this.directionBuffer.length - 1] : this.direction;

        // Evita direções opostas (180 graus) e também comandos repetidos (redundantes)
        const isOpposite = 
            (newDir === 'left' && lastBufferedDir === 'right') ||
            (newDir === 'right' && lastBufferedDir === 'left') ||
            (newDir === 'up' && lastBufferedDir === 'down') ||
            (newDir === 'down' && lastBufferedDir === 'up');

        if (newDir !== lastBufferedDir && !isOpposite) {
            if (this.directionBuffer.length < this.maxBufferLength) {
                this.directionBuffer.push(newDir);
            }
        }
    }

    moveSnake() {
        // 1. Tenta consumir uma direção do buffer ANTES de calcular a nova posição
        if (this.directionBuffer.length > 0) {
            this.direction = this.directionBuffer.shift();
        }

        const head = this.snake[0];
        let newX = head.x;
        let newY = head.y;

        if (this.direction === 'right') newX += this.tileSize;
        else if (this.direction === 'left') newX -= this.tileSize;
        else if (this.direction === 'up') newY -= this.tileSize;
        else if (this.direction === 'down') newY += this.tileSize;

        // Verifica colisão com paredes
        if (newX < 0 || newX >= 720 || newY < 0 || newY >= 1280) {
            this.handleDeath();
            return;
        }

        // Verifica colisão com o próprio corpo
        if (this.snake.some(segment => segment.x === newX && segment.y === newY)) {
            this.handleDeath();
            return;
        }
        
        // Verifica comida
        if (newX === this.food.x && newY === this.food.y) {
            this.score += 10;
            this.food.destroy();

            this.spawnFood();
            // Aumenta velocidade gradualmente até um limite de fluidez
            if (this.moveInterval > 60) this.moveInterval -= 2;

            // Som de comer (coleta)
            this.eatSynth.triggerAttackRelease("E6", "8n"); // E6 por 1/8 de nota
            this.updateUI();
        } else {
            // Remove a cauda se não comeu
            const tail = this.snake.pop();
            tail.destroy();
        }

        // Adiciona nova cabeça
        const newHead = this.add.rectangle(newX, newY, 38, 38, 0x00ff00).setOrigin(0);
        this.snake.unshift(newHead);
    }

    spawnFood() {
        let x, y;
        do {
            x = Math.floor(Math.random() * (720 / this.tileSize)) * this.tileSize;
            y = Math.floor(Math.random() * (1280 / this.tileSize)) * this.tileSize;
        } while (this.snake.some(s => s.x === x && s.y === y));

        this.food = this.add.rectangle(x, y, 38, 38, 0xff0000).setOrigin(0);
    }

    updateUI() {
        this.uiText.setText(`Score: ${this.score}  Recorde: ${this.highScore}`);
    }

    handleDeath() {
        // Som de morte (impacto/game over)
        this.deathSynth.triggerAttackRelease("0.5"); // Duração de 0.5 segundos

        // Salva o recorde se a pontuação atual for maior
        if (this.score > this.highScore) {
            localStorage.setItem('snake_highscore', this.score);
        }
        this.gameOver();
    }

    gameOver() {
        this.scene.start('GameOverScene', { score: this.score });
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
    init(data) { 
        this.finalScore = data.score || 0;
        this.highScore = localStorage.getItem('snake_highscore') || 0;
    }
    create() {
        this.add.text(360, 400, 'FIM DE JOGO', { fontSize: '64px', fill: '#f00' }).setOrigin(0.5);
        this.add.text(360, 600, `Pontos: ${this.finalScore}`, { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
        this.add.text(360, 700, `Melhor Pontuação: ${this.highScore}`, { fontSize: '32px', fill: '#0f0' }).setOrigin(0.5);
        this.add.text(360, 900, 'Toque para Reiniciar', { fontSize: '32px', fill: '#aaa' }).setOrigin(0.5);
        this.input.once('pointerdown', () => this.scene.start('TitleScene'));
    }
}

const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    backgroundColor: '#111',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        orientation: Phaser.Scale.PORTRAIT
    },
    // Adicionamos todas as classes de cena aqui
    scene: [TitleScene, GameScene, GameOverScene]
};

new Phaser.Game(config);