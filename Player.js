export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);

        this.fireRate = 250;
        this.nextFire = 0;
        this.speed = 300;
        this.bulletCount = 1;
        this.isDamageInvulnerable = false; // Inicializa flag de dano
        this.isWaveInvulnerable = false;   // Inicializa flag de transição
        this.hasShield = false;

        // Visual do Escudo (Gráfico simples)
        this.shieldVisual = scene.add.graphics();
        this.shieldVisual.lineStyle(3, 0x00ffff, 0.8);
        this.shieldVisual.strokeCircle(0, 0, 40);
        this.shieldVisual.setVisible(false);

        // Inicia grande e transparente para o efeito de entrada
        this.setScale(scene.shipScale * 4);
        this.alpha = 0;

        // Animação de entrada: diminui a escala e aumenta a opacidade
        scene.tweens.add({
            targets: this,
            scale: scene.shipScale,
            alpha: 1,
            duration: 1200,
            ease: 'Back.easeOut' // Efeito de mola ao chegar no tamanho final
        });

        // Sincroniza o tamanho do hitbox com a imagem do sprite
        // O terceiro parâmetro 'true' centraliza o hitbox automaticamente no meio da nave
        const hbScale = scene.playerHitboxScale || 0.5;
        this.body.setSize(this.width * hbScale, this.height * hbScale, true);
    }

    update(time, cursors) {
        // Se o jogo estiver pausado para upgrade, não processa input
        if (this.scene.isUpgrading) {
            this.setVelocity(0);
            return;
        }
        this.handleInput(cursors);
        this.autoFire(time);

        // Atualiza posição do escudo se ativo
        if (this.hasShield) {
            this.shieldVisual.setPosition(this.x, this.y);
            this.shieldVisual.setVisible(true);
        } else {
            this.shieldVisual.setVisible(false);
        }
    }

    setShield(active) {
        this.hasShield = active;
    }

    // Define a invulnerabilidade após levar dano
    setDamageInvulnerable(duration) {
        this.isDamageInvulnerable = true;
        // Para qualquer tween de invulnerabilidade de dano anterior
        if (this.damageInvulnerableTween) {
            this.damageInvulnerableTween.stop();
            this.damageInvulnerableTween.remove();
        }
        this.damageInvulnerableTween = this.scene.tweens.add({
            targets: this,
            alpha: 0.2,
            duration: 100,
            yoyo: true,
            repeat: (duration / 200) - 1,
            onComplete: () => {
                this.isDamageInvulnerable = false;
                // Só reseta o alpha para 1 se não estiver invulnerável pela onda
                if (!this.isWaveInvulnerable) {
                    this.alpha = 1;
                }
                this.damageInvulnerableTween = null;
            }
        });
    }

    // Define a invulnerabilidade durante a transição de onda
    setWaveInvulnerable(isInvulnerable) {
        this.isWaveInvulnerable = isInvulnerable;
        // Retorna a opacidade ao normal se não estiver mais em transição e nem invulnerável por dano
        if (!isInvulnerable && !this.isDamageInvulnerable) {
            this.alpha = 1;
        }
    }

    handleInput(cursors) {
        if (this.scene.input.activePointer.isDown) {
            this.scene.physics.moveToObject(this, this.scene.input.activePointer, this.speed);
            return;
        }

        this.setVelocity(0);
        if (cursors.left.isDown) this.setVelocityX(-this.speed);
        else if (cursors.right.isDown) this.setVelocityX(this.speed);
        
        if (cursors.up.isDown) this.setVelocityY(-this.speed);
        else if (cursors.down.isDown) this.setVelocityY(this.speed);
    }

    autoFire(time) {
        // Só atira se o tempo permitir E se não estiver em pausa de upgrade ou transição de onda
        if (time > this.nextFire && !this.scene.isUpgrading && !this.isWaveInvulnerable) {
            // Lógica de leque (spread) para múltiplas balas
            const spreadAngle = 15; // Ângulo entre balas em graus
            const totalSpread = (this.bulletCount - 1) * spreadAngle;
            const startAngle = -90 - (totalSpread / 2); // -90 é para cima

            for (let i = 0; i < this.bulletCount; i++) {
                const bullet = this.scene.playerBullets.get(this.x, this.y - 20);
                if (bullet) {
                    bullet.setActive(true).setVisible(true);
                    bullet.body.enable = true; // Reativa o corpo físico

                    const angle = Phaser.Math.DegToRad(startAngle + (i * spreadAngle));
                    const vx = Math.cos(angle) * 600;
                    const vy = Math.sin(angle) * 600;
                    
                    bullet.setAlpha(1)
                          .setScale(this.scene.shipScale)
                          .setVelocity(vx, vy);
                    
                    // Ajusta o hitbox da bala do jogador
                    bullet.body.setSize(bullet.width, bullet.height);
                    
                    // Ajusta a rotação da bala para seguir a trajetória
                    bullet.setRotation(angle + Math.PI / 2);
                }
            }
            this.nextFire = time + this.fireRate;
        }
    }
}