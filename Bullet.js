export default class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
    }

    update() {
        // Em vez de destruir, desativamos e escondemos para reciclagem no pool
        if (this.active && (this.y < -50 || this.y > this.scene.scale.height + 50 || 
            this.x < -50 || this.x > this.scene.scale.width + 50)) {
            this.setActive(false).setVisible(false);
            this.body.enable = false;
        }
    }
}