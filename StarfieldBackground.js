export default class StarfieldBackground {
    constructor(scene, config) {
        this.scene = scene;
        this.config = {
            starDensity: config.starDensity || 150,
            starSlowSpeed: config.starSlowSpeed || 0.5,
            starMediumSpeed: config.starMediumSpeed || 1.2,
            starFastSpeed: config.starFastSpeed || 2.5,
            scaleSlow: config.scaleSlow || 1,
            scaleMedium: config.scaleMedium || 1.2,
            scaleFast: config.scaleFast || 1.5,
            alphaSlow: config.alphaSlow || 0.3,
            alphaMedium: config.alphaMedium || 0.5,
            alphaFast: config.alphaFast || 0.8,
        };

        this.starsSlow = null;
        this.starsMedium = null;
        this.starsFast = null;
    }

    static preload(scene) {
        // Gerar textura de estrelas para o fundo
        const starGraphics = scene.make.graphics();
        starGraphics.fillStyle(0xffffff, 1);
        for (let i = 0; i < 100; i++) { // Densidade fixa para a textura base
            const x = Phaser.Math.Between(0, 512);
            const y = Phaser.Math.Between(0, 512);
            const size = Phaser.Math.FloatBetween(0.5, 2);
            starGraphics.fillCircle(x, y, size);
        }
        starGraphics.generateTexture('starfield', 512, 512);
        starGraphics.destroy();
    }

    create() {
        this.starsSlow = this.scene.add.tileSprite(0, 0, this.scene.scale.width, this.scene.scale.height, 'starfield').setOrigin(0).setAlpha(this.config.alphaSlow).setDepth(-3).setScale(this.config.scaleSlow);
        this.starsMedium = this.scene.add.tileSprite(0, 0, this.scene.scale.width, this.scene.scale.height, 'starfield').setOrigin(0).setAlpha(this.config.alphaMedium).setDepth(-2).setScale(this.config.scaleMedium);
        this.starsFast = this.scene.add.tileSprite(0, 0, this.scene.scale.width, this.scene.scale.height, 'starfield').setOrigin(0).setAlpha(this.config.alphaFast).setDepth(-1).setScale(this.config.scaleFast);
    }

    update() {
        this.starsSlow.tilePositionY -= this.config.starSlowSpeed;
        this.starsMedium.tilePositionY -= this.config.starMediumSpeed;
        this.starsFast.tilePositionY -= this.config.starFastSpeed;
    }
}