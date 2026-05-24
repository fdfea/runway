import Phaser from 'phaser'

const CANVAS_W = 1280
const CANVAS_H = 720
const FONT = 'Inter, Arial'
const DPR  = window.devicePixelRatio || 1

export class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WinScene' })
  }

  create(data: { score: number; elapsed?: number }) {
    const score = data?.score ?? 0
    const elapsed = data?.elapsed ?? 0
    const elapsedMin = Math.floor(elapsed / 60)
    const elapsedSec = elapsed % 60
    const elapsedStr = `${String(elapsedMin).padStart(2, '0')}:${String(elapsedSec).padStart(2, '0')}`

    this.sound.play('game-finished')

    // Semi-transparent dark overlay — also acts as an input blocker so cards beneath can't be dragged
    const overlay = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0)
    overlay.setDepth(0)
    overlay.setInteractive()   // blocks pointer events from passing through to GameScene
    this.tweens.add({
      targets: overlay,
      fillAlpha: 0.72,
      duration: 500,
      ease: 'Cubic.easeOut',
    })

    // Card panel
    const panelW = 460
    const panelH = 360
    const panelX = CANVAS_W / 2
    const panelY = CANVAS_H / 2

    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x0a1628, 0)
    panel.setStrokeStyle(2.5, 0x4fc3f7)
    panel.setDepth(1)

    this.tweens.add({
      targets: panel,
      fillAlpha: 0.97,
      duration: 400,
      delay: 200,
      ease: 'Cubic.easeOut',
    })

    // Congratulations header — starts small, pops in
    const congrats = this.add.text(panelX, panelY - 110, '🎉 Congratulations! 🎉', {
      fontFamily: FONT,
      fontSize: '28px',
      color: '#4fc3f7',
      fontStyle: 'bold',
      resolution: DPR,
    }).setOrigin(0.5, 0.5).setDepth(2).setAlpha(0).setScale(0.4)

    this.tweens.add({
      targets: congrats,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 480,
      delay: 350,
      ease: 'Back.easeOut',
    })

    // Divider line
    const line = this.add.rectangle(panelX, panelY - 64, panelW - 60, 1.5, 0x1e6fa8, 0)
    line.setDepth(2)
    this.tweens.add({ targets: line, fillAlpha: 1, duration: 300, delay: 550 })

    // Score label
    const scoreLbl = this.add.text(panelX, panelY - 30, 'FINAL SCORE', {
      fontFamily: FONT,
      fontSize: '14px',
      color: '#7ab8d9',
      letterSpacing: 3,
      resolution: DPR,
    }).setOrigin(0.5, 0.5).setDepth(2).setAlpha(0)

    this.tweens.add({ targets: scoreLbl, alpha: 1, duration: 300, delay: 600 })

    // Score value — big and prominent
    const scoreVal = this.add.text(panelX, panelY + 22, score.toString(), {
      fontFamily: FONT,
      fontSize: '60px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: DPR,
    }).setOrigin(0.5, 0.5).setDepth(2).setAlpha(0).setScale(0.6)

    this.tweens.add({
      targets: scoreVal,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      delay: 700,
      ease: 'Back.easeOut',
    })

    // Time label and value — less prominent than the score
    const timeLbl = this.add.text(panelX, panelY + 92, 'TIME', {
      fontFamily: FONT,
      fontSize: '12px',
      color: '#7ab8d9',
      letterSpacing: 2,
      resolution: DPR,
    }).setOrigin(0.5, 0.5).setDepth(2).setAlpha(0)

    this.tweens.add({ targets: timeLbl, alpha: 1, duration: 300, delay: 850 })

    const timeVal = this.add.text(panelX, panelY + 112, elapsedStr, {
      fontFamily: FONT,
      fontSize: '22px',
      color: '#a0c8e8',
      resolution: DPR,
    }).setOrigin(0.5, 0.5).setDepth(2).setAlpha(0)

    this.tweens.add({ targets: timeVal, alpha: 1, duration: 300, delay: 900 })

    // Play Again button
    const btnW = 180
    const btnH = 44
    const btnX = panelX
    const btnY = panelY + 155

    const btn = this.add.rectangle(btnX, btnY, btnW, btnH, 0x1a5fa8)
    btn.setStrokeStyle(1.5, 0x4fc3f7)
    btn.setDepth(2)
    btn.setAlpha(0)
    btn.setInteractive({ useHandCursor: true })

    const btnText = this.add.text(btnX, btnY, 'Play Again', {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#e8f4fd',
      resolution: DPR,
    }).setOrigin(0.5, 0.5).setDepth(3).setAlpha(0)

    this.tweens.add({ targets: [btn, btnText], alpha: 1, duration: 300, delay: 1000 })

    btn.on('pointerover', () => btn.setFillStyle(0x2278c8))
    btn.on('pointerout', () => btn.setFillStyle(0x1a5fa8))
    btn.on('pointerdown', () => {
      this.scene.stop('WinScene')
      this.scene.get('GameScene').scene.restart()
    })
  }
}
