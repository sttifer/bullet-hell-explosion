export default class UpgradeWindow {
    constructor(scene, onSelect) {
        this.scene = scene;
        this.onSelect = onSelect;
        this.container = null;
        
        this.upgrades = [
            { id: 'speed', title: 'Propulsores', desc: 'Velocidade +25', icon: '🚀' },
            { id: 'fireRate', title: 'Resfriamento', desc: 'Cadência +15%', icon: '🔥' },
            { id: 'multiShot', title: 'Canhões Extra', desc: 'Bala Adicional', icon: '⚔️' },
            { id: 'extraLife', title: 'Suporte Vital', desc: 'Ganhe 1 Vida', icon: '❤️' },
            { id: 'shield', title: 'Escudo', desc: 'Proteção Extra', icon: '🛡️' }
        ];
    }

    show() {
        const { width, height } = this.scene.scale;
        this.container = this.scene.add.container(0, 0).setDepth(1000);

        // Fundo escurecido
        const bg = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);
        this.container.add(bg);

        const title = this.scene.add.text(width / 2, height * 0.2, 'ESCOLHA UMA MELHORIA', { 
            fontSize: '40px', fill: '#fff', fontWeight: 'bold' 
        }).setOrigin(0.5);
        this.container.add(title);

        // Filtra os upgrades: remove 'extraLife' se já tiver 3 vidas
        let availableUpgrades = [...this.upgrades];
        if (this.scene.lives >= 3) {
            availableUpgrades = availableUpgrades.filter(upgrade => upgrade.id !== 'extraLife');
        }

        // Filtra o upgrade de escudo se o jogador já tiver um ativo
        if (this.scene.player && this.scene.player.hasShield) {
            availableUpgrades = availableUpgrades.filter(upgrade => upgrade.id !== 'shield');
        }

        // Sorteia 3 opções aleatórias dos disponíveis
        const selectedUpgrades = Phaser.Utils.Array.Shuffle(availableUpgrades).slice(0, 3);

        selectedUpgrades.forEach((upgrade, index) => {
            this.createOption(upgrade, index, width, height);
        });
    }

    createOption(upgrade, index, screenWidth, screenHeight) {
        const x = screenWidth / 2;
        const y = screenHeight * 0.4 + (index * 180);

        const button = this.scene.add.rectangle(x, y, screenWidth * 0.8, 140, 0x333333)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x00ff00);

        const icon = this.scene.add.text(x - 220, y, upgrade.icon, { fontSize: '50px' }).setOrigin(0.5);
        const title = this.scene.add.text(x - 160, y - 20, upgrade.title, { fontSize: '28px', fill: '#00ff00', fontWeight: 'bold' }).setOrigin(0);
        const desc = this.scene.add.text(x - 160, y + 15, upgrade.desc, { fontSize: '20px', fill: '#cccccc' }).setOrigin(0);

        this.container.add([button, icon, title, desc]);

        button.on('pointerover', () => button.setFillStyle(0x444444));
        button.on('pointerout', () => button.setFillStyle(0x333333));
        button.on('pointerdown', () => this.select(upgrade.id));
    }

    select(upgradeId) {
        this.container.destroy();
        this.onSelect(upgradeId);
    }
}