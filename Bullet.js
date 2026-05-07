export default class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
    }

    update() {
        if (this.y < -50 || this.y > this.scene.scale.height + 50 || 
            this.x < -50 || this.x > this.scene.scale.width + 50) {
            this.destroy();
        }
    }
}