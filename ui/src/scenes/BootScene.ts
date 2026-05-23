import Phaser from 'phaser'
import {
  ALL_CARD_KEYS,
  CARD_BACK_KEY,
  CARD_BACK_PATH,
  BACKGROUND_KEY,
  BACKGROUND_PATH,
} from '../utils/CardAssetMap'

// Card dimensions used throughout the game (display size in pixels)
export const CARD_WIDTH = 71
export const CARD_HEIGHT = 97

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // Loading bar
    const { width, height } = this.scale
    const barW = 400
    const barH = 20
    const barX = (width - barW) / 2
    const barY = height / 2 - 10

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x0a1628)
    bg.setDepth(0)

    const barBg = this.add.rectangle(barX, barY, barW, barH, 0x1a2e4a).setOrigin(0, 0)
    barBg.setDepth(1)
    const barFill = this.add.rectangle(barX, barY, 0, barH, 0x4fc3f7).setOrigin(0, 0)
    barFill.setDepth(2)

    const loadingText = this.add
      .text(width / 2, barY - 30, 'Loading...', {
        fontFamily: 'Inter, Arial',
        fontSize: '18px',
        color: '#b0c4de',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(2)

    this.load.on('progress', (value: number) => {
      barFill.width = barW * value
    })

    this.load.on('complete', () => {
      loadingText.setText('Ready!')
    })

    // Load background JPG
    this.load.image(BACKGROUND_KEY, BACKGROUND_PATH)

    // Load card back at 2x display size for crispness (matches SVG card resolution)
    this.load.image(CARD_BACK_KEY, CARD_BACK_PATH)

    // Load all 52 card face SVGs
    for (const entry of ALL_CARD_KEYS) {
      this.load.svg(entry.key, entry.path, { width: CARD_WIDTH * 2, height: CARD_HEIGHT * 2 })
    }
  }

  create() {
    // Wait for web fonts to be ready before starting the game scene to
    // prevent a flash of unstyled/blurry text on first render.
    document.fonts.ready.then(() => {
      this.scene.start('GameScene')
    })
  }
}
