export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, targetX, targetY, shotPattern, bulletDensityLevel, movementType, phaseDelay, hp, textureKey, travelDuration, movementMultiplier) {
        super(scene, x, y, textureKey);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.hp = hp;
        this.targetX = targetX;
        this.targetY = targetY;
        this.shotPattern = shotPattern;
        this.bulletDensityLevel = bulletDensityLevel; // Novo: Nível de densidade de balas
        this.movementType = movementType;
        this.phaseDelay = phaseDelay; // Defasagem para o movimento em fila
        this.movementMultiplier = movementMultiplier || 1; // Multiplicador de direção (1 ou -1)
        this.isMovingToPosition = true;
        this.hasArrived = false; // Novo: Flag para indicar que chegou ao destino
        this.startPatternMovementFlag = false; // Novo: Flag para iniciar o movimento do padrão
        this.isInvulnerable = true;
        this.shootTimer = null;

        // Inicia grande e transparente para dar impressão de que está descendo
        this.setScale(scene.shipScale * 3);
        this.alpha = 0;

        // Animação de entrada sincronizada com a chegada na posição
        scene.tweens.add({
            targets: this,
            scale: scene.shipScale,
            alpha: 1,
            x: targetX,
            y: targetY,
            duration: travelDuration,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.isMovingToPosition = false;
                this.hasArrived = true;
                this.body.reset(this.targetX, this.targetY);
                this.scene.enemyArrived();
            }
        });

        // Sincroniza o tamanho do hitbox com a imagem do sprite
        // Isso garante que a colisão seja do tamanho exato do desenho
        this.body.setSize(this.width, this.height);
    }

    update() {
        const time = this.scene.time.now;

        if (this.startPatternMovementFlag) { // Só move se a cena sinalizou
            // Lógica de movimento cíclico após a chegada
            // O tempo 't' é calculado a partir do 'waveMovementStartTime' da cena, com o 'phaseDelay' individual
            // Multiplicamos pelo waveMovementSpeed da cena para acelerar o padrão
            let t = ((time - this.scene.waveMovementStartTime) / 1000) * this.scene.waveMovementSpeed;
            
            // Aplica o phaseDelay apenas para movimentos que precisam de defasagem (ex: circular em fila)
            if (this.movementType === 'circle') t -= this.phaseDelay;
            if (t < 0) return; // Aguarda o tempo de defasagem

            switch (this.movementType) {
                case 'circle':
                    // Orbita partindo suavemente do ponto de parada (sem saltos)
                    const radius = 50;
                    this.x = this.targetX + Math.sin(t * 2) * radius;
                    this.y = this.targetY + (1 - Math.cos(t * 2)) * radius;
                    break;
                
                case 'sine':
                    // Movimento sinusoidal horizontal
                    this.x = this.targetX + Math.sin(t * 2) * 100 * this.movementMultiplier;
                    break;
            }
        }
    }

    startPatternMovement(waveStartTime) {
        this.startPatternMovementFlag = true;
        this.isInvulnerable = false;

        // Dispara o primeiro tiro imediatamente
        this.fire();

        // Inicia o timer de tiro apenas quando o movimento começa
        this.shootTimer = this.scene.time.addEvent({
            delay: 1500 + Math.random() * 1000,
            callback: () => this.fire(),
            loop: true
        });
    }

    takeDamage() {
        if (this.isInvulnerable) return;

        this.hp--;
        this.setTint(0xffffff);
        this.scene.time.delayedCall(50, () => this.clearTint());
        if (this.hp <= 0) {
            // Explosão de morte usando o emissor da cena
            this.scene.deathParticles.explode(20, this.x, this.y);
            this.scene.addScore(10);
            this.shootTimer.destroy();
            this.destroy();
        }
    }

    fire() {
        if (!this.active) return;

        let totalBullets;
        let angleStep;
        // A velocidade das balas agora escala com a dificuldade da onda
        let bulletSpeed = 150 * this.scene.waveMovementSpeed;

        switch (this.shotPattern) {
            case 0: // Círculo Simples (8)
                totalBullets = 8 * this.bulletDensityLevel; // Escala o número de balas pelo nível de densidade
                angleStep = (Math.PI * 2) / totalBullets;
                for (let i = 0; i < totalBullets; i++) {
                    this.createBullet(Math.cos(i * angleStep) * bulletSpeed, Math.sin(i * angleStep) * bulletSpeed);
                }
                break;
            case 1: // Direcionado ao Jogador
                const aimSpeed = 250 * this.scene.waveMovementSpeed;
                if (this.bulletDensityLevel === 1) {
                    this.shootAtPlayer(aimSpeed); // 1 bala
                } else if (this.bulletDensityLevel === 2) {
                    this.shootAtPlayer(aimSpeed, -Phaser.Math.DegToRad(10));
                    this.shootAtPlayer(aimSpeed, Phaser.Math.DegToRad(10));
                } else { // densityLevel 3 ou superior
                    this.shootAtPlayer(aimSpeed, -Phaser.Math.DegToRad(15));
                    this.shootAtPlayer(aimSpeed, 0);
                    this.shootAtPlayer(aimSpeed, Phaser.Math.DegToRad(15));
                }
                break;
            case 2: // Triple Spread (Leque)
                totalBullets = 3 + (this.bulletDensityLevel - 1) * 2; // 3, 5, 7 balas
                let spreadAngle = Phaser.Math.DegToRad(30); // Ângulo total reduzido para fechar o cone
                let startAngle = Math.PI / 2 - (spreadAngle / 2); // Começa do centro para cima
                
                if (totalBullets > 1) {
                    angleStep = spreadAngle / (totalBullets - 1);
                } else {
                    angleStep = 0; // Apenas uma bala, sem passo de ângulo
                }
                
                for (let i = 0; i < totalBullets; i++) {
                    let currentAngle = startAngle + (i * angleStep);
                    this.createBullet(Math.cos(currentAngle) * (200 * this.scene.waveMovementSpeed), Math.sin(currentAngle) * (200 * this.scene.waveMovementSpeed));
                }
                break;
            case 3: // Cruz (4 direções)
                totalBullets = 4 * this.bulletDensityLevel; // 4, 8, 12 balas
                angleStep = (Math.PI * 2) / totalBullets;
                for (let i = 0; i < totalBullets; i++) {
                    this.createBullet(Math.cos(i * angleStep) * (180 * this.scene.waveMovementSpeed), Math.sin(i * angleStep) * (180 * this.scene.waveMovementSpeed));
                }
                break;
            case 4: // Tiro duplo reto
                totalBullets = 2 * this.bulletDensityLevel; // 2, 4, 6 balas
                let horizontalOffset = 20; // Offset base do centro
                for (let i = 0; i < totalBullets; i++) {
                    // Spawna pares de balas, aumentando a distância do centro
                    let currentOffset = horizontalOffset * (Math.floor(i / 2) + 1);
                    this.createBullet((i % 2 === 0 ? -1 : 1) * currentOffset, 300 * this.scene.waveMovementSpeed);
                }
                break;
            case 5: // Círculo Grande (16)
                totalBullets = 16 + (this.bulletDensityLevel - 1) * 8; // 16, 24, 32 balas
                angleStep = (Math.PI * 2) / totalBullets;
                for (let i = 0; i < totalBullets; i++) {
                    this.createBullet(Math.cos(i * angleStep) * (120 * this.scene.waveMovementSpeed), Math.sin(i * angleStep) * (120 * this.scene.waveMovementSpeed));
                }
                break;
            case 6: // Estrela (5 direções)
                totalBullets = 5 * this.bulletDensityLevel; // 5, 10, 15 balas
                angleStep = (Math.PI * 2) / totalBullets;
                for (let i = 0; i < totalBullets; i++) {
                    this.createBullet(Math.cos(i * angleStep) * (200 * this.scene.waveMovementSpeed), Math.sin(i * angleStep) * (200 * this.scene.waveMovementSpeed));
                }
                break;
            case 7: // Laterais apenas
                totalBullets = 2 * this.bulletDensityLevel;
                // Reduzido sideSpeedX para fechar o ângulo diagonal, tornando-o mais vertical
                let sideSpeedX = 100 * this.scene.waveMovementSpeed; 
                let sideSpeedY = 200 * this.scene.waveMovementSpeed;
                for (let i = 0; i < totalBullets; i++) {
                    let vy = sideSpeedY + (Math.floor(i / 2) * (50 * this.scene.waveMovementSpeed));
                    this.createBullet((i % 2 === 0 ? -1 : 1) * sideSpeedX, vy);
                }
                break;
            case 8: // Chuva (Apenas para baixo, rápido)
                totalBullets = this.bulletDensityLevel; // 1, 2, 3 balas
                let rainSpeed = 400;
                let rainSpreadX = 100; // Espalhamento horizontal máximo
                let rainStaggerY = 50; // Escalonamento vertical
                for (let i = 0; i < totalBullets; i++) {
                    // Posição X aleatória dentro de um espalhamento, escalonado em Y
                    this.createBullet(Phaser.Math.Between(-rainSpreadX / 2, rainSpreadX / 2), rainSpeed + (i * rainStaggerY));
                }
                break;
            case 9: // X-Pattern
                totalBullets = 4 * this.bulletDensityLevel; // 4, 8, 12 balas
                angleStep = (Math.PI * 2) / totalBullets;
                for (let i = 0; i < totalBullets; i++) {
                    this.createBullet(Math.cos(i * angleStep + Math.PI/4) * (150 * this.scene.waveMovementSpeed), Math.sin(i * angleStep + Math.PI/4) * (150 * this.scene.waveMovementSpeed));
                };
                break;
        }
    }

    shootAtPlayer(speed, angleOffset = 0) { // Adicionado angleOffset para espalhamento
        if (this.scene.player) {
            // Calcula a direção para o jogador e aplica o offset
            const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
            const finalAngle = angleToPlayer + angleOffset;
            const vx = Math.cos(finalAngle) * speed;
            const vy = Math.sin(finalAngle) * speed;
            this.createBullet(vx, vy);
        }
    }

    createBullet(vx, vy) {
        const bullet = this.scene.enemyBullets.get(this.x, this.y);
        if (bullet) {
            bullet.setActive(true).setVisible(true);

            // Aplica a escala global para que as balas fiquem proporcionais às naves
            bullet.setScale(this.scene.shipScale);
            // Ajusta o hitbox da bala para o tamanho real da imagem escalada
            bullet.body.setSize(bullet.width, bullet.height);

            bullet.setVelocity(vx, vy);
            // Calcula o ângulo da velocidade e rotaciona a bala para apontar na direção do movimento
            // Adiciona Math.PI / 2 (90 graus) porque a textura da bala geralmente aponta para cima por padrão
            const angle = Phaser.Math.Angle.Between(0, 0, vx, vy);
            bullet.setRotation(angle + Math.PI / 2);
        }
        return bullet;
    }
}