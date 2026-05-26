import Phaser from 'phaser'
import { Game as CardGame, Moves, Card } from 'runway-engine'
import { cardToKey, CARD_BACK_KEY, BACKGROUND_KEY } from '../utils/CardAssetMap'
import { CARD_WIDTH, CARD_HEIGHT } from './BootScene'

// ─── Layout constants ────────────────────────────────────────────────────────
const BANNER_H = 65
const CANVAS_W = 1280
const CANVAS_H = 720

// Foundation piles: top row
const FOUND_Y = BANNER_H + 18 + CARD_HEIGHT / 2 + 6
const FOUND_HORIZ_OFFSET = 16           // how much each card offsets to the right in the fan
const FOUND_COUNT = 4

// We place foundations at fixed X positions with enough room to fully fan 13 cards.
// Full fan width for 13 cards: CARD_WIDTH + 12*FOUND_HORIZ_OFFSET
const FOUND_FAN_W = CARD_WIDTH + 12 * FOUND_HORIZ_OFFSET   // ~287
const FOUND_SPACING = FOUND_FAN_W + 10                     // ~297 (tighter gap to allow shifting right)
const FOUND_START_X = 200

// Tableau piles: middle row
const TAB_Y = FOUND_Y + CARD_HEIGHT / 2 + 28 + CARD_HEIGHT / 2   // below foundations with gap
const TAB_COUNT = 7
const TAB_SPACING = (CANVAS_W - 80) / TAB_COUNT             // evenly spread
const TAB_START_X = 40 + TAB_SPACING / 2
const TAB_HIDDEN_OFFSET = 16            // vertical offset for face-down stack
const TAB_FACE_OFFSET = 26             // vertical offset for face-up cards

// Stock pile: bottom-left
const STOCK_X = 80
const STOCK_Y = CANVAS_H - 100
const STOCK_OFFSET = 3                 // very tight fan

// Score pile: bottom row — cards fan horizontally left-to-right.
// Cards start near the stock pile and expand right, compressing dynamically as the pile grows.
// SCORE_LEFT_X is chosen so the gap between the stock pile's right edge and the score slot's
// left edge equals the gap between the score slot's right edge and the canvas right edge (~36.5 px).
const SCORE_LEFT_X = 196
const SCORE_RIGHT_X = CANVAS_W - 80  // rightmost card center (stays near right edge)
const SCORE_MAX_OFFSET = 80          // comfortable per-card offset when pile is small
const SCORE_Y = CANVAS_H - 100

// Drag depths
const DEPTH_BACKGROUND = 0
const DEPTH_PILE_SLOTS = 1
const DEPTH_CARDS = 2
const DEPTH_DRAGGING = 500
const DEPTH_BANNER = 100
const DEPTH_UI = 101

// Animation durations (ms)
const DEAL_DURATION = 220
const DEAL_STAGGER = 60
const FLIP_DURATION = 180
const RETURN_DURATION = 280
const SNAP_DURATION = 240
const FOUND_STAGGER = 80   // ms between successive cards in a foundation merge
const TAB_STAGGER = 60     // ms between successive cards in a tableau merge

type PileType = 'foundation' | 'tableau' | 'stock' | 'score'

interface PileTarget {
  type: PileType
  index: number   // foundation 0-3, tableau 0-6, stock=0, score=0
  x: number
  y: number
}

interface DragState {
  cards: Phaser.GameObjects.Image[]       // the dragged card sprites (may be a run)
  sourceType: PileType
  sourceIndex: number
  engineCards: Card[]                     // the engine Card objects
  offsetX: number[]
  offsetY: number[]
  originX: number[]
  originY: number[]
  originDepth: number[]                   // original depth values for restoring after a failed drop
}

export class GameScene extends Phaser.Scene {
  private cardGame!: CardGame

  // Visual card sprites: keyed by card toString()
  private cardSprites: Map<string, Phaser.GameObjects.Image> = new Map()

  // Pile slot outlines (ghost rectangles showing pile positions)
  private pileSlots: Phaser.GameObjects.Rectangle[] = []

  private scoreText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private moveCountText!: Phaser.GameObjects.Text
  private timerEvent: Phaser.Time.TimerEvent | null = null
  private elapsedSeconds = 0
  private drag: DragState | null = null
  private animating = false
  private pointerDownPos: { x: number; y: number } | null = null

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    this.cardGame = new CardGame()
    this.cardSprites = new Map()
    this.drag = null
    this.animating = false

    this.drawBackground()
    this.drawBanner()
    this.drawPileSlots()
    this.buildAllCardSprites()

    // dealAnimation() sets up all sprites on the stock pile ready to fly, and
    // returns a startDeal callback that fires the tweens + sound together.
    const startDeal = this.dealAnimation()

    // On restart the audio context is already unlocked, so deal immediately.
    // On a fresh page load, browsers block audio until the user interacts with
    // the page — an invisible overlay over the card area (below the banner)
    // captures that first click/tap, satisfying the autoplay policy so the
    // deal sound always plays in sync with the animation. The banner is left
    // uncovered so Rules and Restart remain clickable at all times.
    const data = this.scene.settings.data as { fromRestart?: boolean } | undefined
    if (data?.fromRestart) {
      startDeal()
    } else {
      const overlayH = CANVAS_H - BANNER_H
      const overlay = this.add.rectangle(CANVAS_W / 2, BANNER_H + overlayH / 2, CANVAS_W, overlayH, 0x000000, 0)
      overlay.setDepth(DEPTH_DRAGGING + 1)
      overlay.setInteractive()
      overlay.once('pointerdown', () => {
        overlay.destroy()
        startDeal()
      })
    }

    this.drawAttribution()
  }

  // ─── Background ────────────────────────────────────────────────────────────

  private drawBackground() {
    const bg = this.add.image(CANVAS_W / 2, CANVAS_H / 2, BACKGROUND_KEY)
    bg.setDisplaySize(CANVAS_W, CANVAS_H)
    bg.setDepth(DEPTH_BACKGROUND)
  }

  // ─── Banner ────────────────────────────────────────────────────────────────

  private drawBanner() {
    const dpr = window.devicePixelRatio || 1

    // Dark blue banner bar
    const banner = this.add.rectangle(CANVAS_W / 2, BANNER_H / 2, CANVAS_W, BANNER_H, 0x0a1628)
    banner.setDepth(DEPTH_BANNER)

    // Thin accent line at banner bottom
    const accent = this.add.rectangle(CANVAS_W / 2, BANNER_H, CANVAS_W, 2, 0x1e6fa8)
    accent.setDepth(DEPTH_BANNER)

    // Rules button
    const rulesBg = this.add.rectangle(50, BANNER_H / 2, 76, 36, 0x1a3e6e, 1)
    rulesBg.setDepth(DEPTH_UI)
    rulesBg.setInteractive({ useHandCursor: true })
    rulesBg.setStrokeStyle(1.5, 0x4fc3f7)

    const rulesText = this.add.text(50, BANNER_H / 2, 'Rules', {
      fontFamily: 'Inter, Arial',
      fontSize: '14px',
      color: '#b0d8f5',
      resolution: window.devicePixelRatio || 1,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH_UI)

    rulesBg.on('pointerover', () => { rulesBg.setFillStyle(0x1e5fa8) })
    rulesBg.on('pointerout', () => { rulesBg.setFillStyle(0x1a3e6e) })
    rulesBg.on('pointerdown', () => {
      if (!this.scene.isActive('RulesScene')) {
        this.scene.launch('RulesScene')
      }
    })

    // Keep rulesText reference alive (avoids unused-variable lint warning)
    void rulesText

    // Timer display (to the right of the Rules button)
    const timerLabelStyle = { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#7ab8d9', resolution: dpr }
    this.add.text(152, BANNER_H / 2 - 9, 'TIME', timerLabelStyle).setOrigin(0.5, 0.5).setDepth(DEPTH_UI)

    const timerStyle = { fontFamily: 'Inter, Arial', fontSize: '18px', color: '#4fc3f7', fontStyle: 'bold', resolution: dpr }
    this.timerText = this.add.text(152, BANNER_H / 2 + 9, '00:00', timerStyle).setOrigin(0.5, 0.5).setDepth(DEPTH_UI)

    // Move count display (to the right of the timer)
    this.add.text(240, BANNER_H / 2 - 9, 'MOVE', timerLabelStyle).setOrigin(0.5, 0.5).setDepth(DEPTH_UI)
    this.moveCountText = this.add.text(240, BANNER_H / 2 + 9, '0', timerStyle).setOrigin(0.5, 0.5).setDepth(DEPTH_UI)

    // Game title
    const titleStyle = { fontFamily: 'Inter, Arial', fontSize: '22px', color: '#e8f4fd', fontStyle: 'bold', resolution: dpr }
    this.add.text(CANVAS_W / 2, BANNER_H / 2, 'RUNWAY', titleStyle).setOrigin(0.5, 0.5).setDepth(DEPTH_UI)

    // Score label
    const scoreLabelStyle = { fontFamily: 'Inter, Arial', fontSize: '15px', color: '#7ab8d9', resolution: dpr }
    this.add.text(CANVAS_W - 200, BANNER_H / 2, 'Score', scoreLabelStyle).setOrigin(0.5, 0.5).setDepth(DEPTH_UI)

    const scoreStyle = { fontFamily: 'Inter, Arial', fontSize: '22px', color: '#4fc3f7', fontStyle: 'bold', resolution: dpr }
    this.scoreText = this.add.text(CANVAS_W - 145, BANNER_H / 2, '0', scoreStyle).setOrigin(0, 0.5)
    this.scoreText.setDepth(DEPTH_UI)

    // Restart button
    const restartBg = this.add.rectangle(CANVAS_W - 52, BANNER_H / 2, 76, 36, 0x1a3e6e, 1)
    restartBg.setDepth(DEPTH_UI)
    restartBg.setInteractive({ useHandCursor: true })
    restartBg.setStrokeStyle(1.5, 0x4fc3f7)

    const restartText = this.add.text(CANVAS_W - 52, BANNER_H / 2, '↺ Restart', {
      fontFamily: 'Inter, Arial',
      fontSize: '14px',
      color: '#b0d8f5',
      resolution: window.devicePixelRatio || 1,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH_UI)

    restartBg.on('pointerover', () => { restartBg.setFillStyle(0x1e5fa8) })
    restartBg.on('pointerout', () => { restartBg.setFillStyle(0x1a3e6e) })
    restartBg.on('pointerdown', () => this.restartGame())
  }

  // ─── Pile slot outlines ────────────────────────────────────────────────────

  private drawPileSlots() {
    const slotColor = 0x1a4a2a
    const slotAlpha = 0.55
    const slotStroke = 0x2a8a4a
    const r = 6

    // Foundation slots
    for (let i = 0; i < FOUND_COUNT; i++) {
      const x = foundationX(i)
      const rect = this.add.rectangle(x, FOUND_Y, CARD_WIDTH, CARD_HEIGHT, slotColor, slotAlpha)
      rect.setStrokeStyle(1.5, slotStroke)
      rect.setDepth(DEPTH_PILE_SLOTS)
      this.pileSlots.push(rect)
    }

    // Tableau slots
    for (let i = 0; i < TAB_COUNT; i++) {
      const x = tableauX(i)
      const rect = this.add.rectangle(x, TAB_Y, CARD_WIDTH, CARD_HEIGHT, slotColor, slotAlpha)
      rect.setStrokeStyle(1.5, slotStroke)
      rect.setDepth(DEPTH_PILE_SLOTS)
      this.pileSlots.push(rect)
    }

    // Stock slot
    const stockSlot = this.add.rectangle(STOCK_X, STOCK_Y, CARD_WIDTH, CARD_HEIGHT, slotColor, slotAlpha)
    stockSlot.setStrokeStyle(1.5, slotStroke)
    stockSlot.setDepth(DEPTH_PILE_SLOTS)

    // Score slot — spans from leftmost to rightmost possible card position
    const scoreSlotW = (SCORE_RIGHT_X - SCORE_LEFT_X) + CARD_WIDTH + 16
    const scoreSlotH = CARD_HEIGHT + 16
    const scoreSlotX = (SCORE_LEFT_X + SCORE_RIGHT_X) / 2
    const scoreSlot = this.add.rectangle(scoreSlotX, SCORE_Y, scoreSlotW, scoreSlotH, slotColor, slotAlpha)
    scoreSlot.setStrokeStyle(1.5, slotStroke)
    scoreSlot.setDepth(DEPTH_PILE_SLOTS)
  }

  // ─── Card sprite factory ───────────────────────────────────────────────────

  private makeCardSprite(card: Card, x: number, y: number, faceUp: boolean): Phaser.GameObjects.Image {
    const key = faceUp ? cardToKey(card) : CARD_BACK_KEY
    const sprite = this.add.image(x, y, key)
    sprite.setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
    sprite.setDepth(DEPTH_CARDS)
    sprite.setData('card', card)
    sprite.setData('faceUp', faceUp)
    return sprite
  }

  private buildAllCardSprites() {
    this.rebuildAllSprites(false)
  }

  // ─── Full render sync from engine state ────────────────────────────────────

  private rebuildAllSprites(animate = true) {
    // Destroy all existing sprites
    for (const [, sprite] of this.cardSprites) {
      sprite.destroy()
    }
    this.cardSprites.clear()

    // Foundation piles
    for (let fi = 0; fi < 4; fi++) {
      const pile = this.cardGame.getFoundationPile(fi)!
      const cards = [...pile]
      for (let ci = 0; ci < cards.length; ci++) {
        const card = cards[ci]
        const cx = foundationX(fi) + ci * FOUND_HORIZ_OFFSET
        const cy = FOUND_Y
        const sprite = this.makeCardSprite(card, cx, cy, true)
        this.cardSprites.set(card.toString(), sprite)
      }
    }

    // Tableau piles
    for (let ti = 0; ti < 7; ti++) {
      const pile = this.cardGame.getTableauPile(ti)!
      this.renderTableauPile(ti, pile)
    }

    // Stock pile
    const stock = [...this.cardGame.getStockPile()]
    for (let ci = 0; ci < stock.length; ci++) {
      const card = stock[ci]
      const cx = STOCK_X
      const cy = STOCK_Y - ci * STOCK_OFFSET
      const sprite = this.makeCardSprite(card, cx, cy, false)
      this.cardSprites.set(card.toString() + '_stock_' + ci, sprite)
    }
    this.setupStockInteraction()

    // Score pile
    this.renderScorePile()
    this.setupScoreInteraction()
  }

  // Render a single tableau pile column
  private renderTableauPile(
    ti: number,
    pile: ReturnType<CardGame['getTableauPile']>,
  ) {
    if (!pile) return
    const tx = tableauX(ti)

    // Hidden cards — lower depth band: DEPTH_CARDS + ti*20 + hi
    // Using per-pile bands (20 slots each) ensures hidden cards never overlap face-up cards
    const hiddenCount = pile.hiddenRemaining()
    for (let hi = 0; hi < hiddenCount; hi++) {
      const cy = TAB_Y + hi * TAB_HIDDEN_OFFSET
      const sprite = this.add.image(tx, cy, CARD_BACK_KEY)
      sprite.setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
      sprite.setDepth(DEPTH_CARDS + ti * 20 + hi)
      sprite.setData('hidden', true)
      sprite.setData('tableauIndex', ti)
      this.cardSprites.set(`hidden_${ti}_${hi}`, sprite)
    }

    // Active (face-up) cards — higher depth band: DEPTH_CARDS + 200 + ti*20 + ci
    // Starting at +200 guarantees all face-up cards are always above all hidden cards
    const activeCards = [...pile]
    const activeStart = hiddenCount * TAB_HIDDEN_OFFSET
    for (let ci = 0; ci < activeCards.length; ci++) {
      const card = activeCards[ci]
      const cy = TAB_Y + activeStart + ci * TAB_FACE_OFFSET
      const sprite = this.makeCardSprite(card, tx, cy, true)
      sprite.setDepth(DEPTH_CARDS + 200 + ti * 20 + ci)
      sprite.setData('tableauIndex', ti)
      sprite.setData('activeIndex', ci)
      this.cardSprites.set(card.toString(), sprite)
    }

    // Set up click-to-reveal on the pile column if active is empty and hidden remains
    this.setupTableauReveal(ti)
    this.setupTableauDrag(ti)
  }

  // ─── Foundation interaction (none — display only) ─────────────────────────
  // (foundations are just visual; drops are handled by drop-zone detection in drag release)

  // ─── Tableau reveal (click on empty-active pile) ──────────────────────────

  private setupTableauReveal(ti: number) {
    const pile = this.cardGame.getTableauPile(ti)!
    if (pile.empty() && pile.hiddenRemaining() > 0) {
      const tx = tableauX(ti)
      const hiddenCount = pile.hiddenRemaining()
      const topHiddenKey = `hidden_${ti}_${hiddenCount - 1}`
      const topHiddenSprite = this.cardSprites.get(topHiddenKey)
      if (topHiddenSprite) {
        topHiddenSprite.setInteractive()
        topHiddenSprite.on('pointerdown', () => {
          if (this.animating) return
          this.doRevealFromTableau(ti)
        })
      } else {
        // No hidden sprite found — create a transparent click zone over the slot
        const zone = this.add.rectangle(tx, TAB_Y, CARD_WIDTH, CARD_HEIGHT, 0xffffff, 0)
        zone.setDepth(DEPTH_CARDS)
        zone.setInteractive()
        zone.on('pointerdown', () => {
          if (this.animating) return
          this.doRevealFromTableau(ti)
          zone.destroy()
        })
        this.cardSprites.set(`reveal_zone_${ti}`, zone as unknown as Phaser.GameObjects.Image)
      }
    }
  }

  private doRevealFromTableau(ti: number) {
    const pile = this.cardGame.getTableauPile(ti)!
    if (!pile.empty() || pile.depleted()) return
    try {
      this.cardGame.makeMove(Moves.RevealFromTableauPile(ti))
      const newTopCard = [...this.cardGame.getTableauPile(ti)!][0]
      this.animateReveal(ti, newTopCard)
    } catch (e) {
      // nothing to reveal
    }
  }

  private animateReveal(ti: number, card: Card) {
    this.animating = true
    this.sound.play('card-playing')
    const tx = tableauX(ti)
    const pile = this.cardGame.getTableauPile(ti)!
    const hiddenCount = pile.hiddenRemaining()  // after reveal, this is one less
    const cy = TAB_Y + hiddenCount * TAB_HIDDEN_OFFSET

    // Remove the old top-hidden sprite
    const oldKey = `hidden_${ti}_${hiddenCount}`
    const oldSprite = this.cardSprites.get(oldKey)
    if (oldSprite) {
      oldSprite.destroy()
      this.cardSprites.delete(oldKey)
    }

    // Remove reveal zone if present
    const zoneKey = `reveal_zone_${ti}`
    const zone = this.cardSprites.get(zoneKey)
    if (zone) { zone.destroy(); this.cardSprites.delete(zoneKey) }

    // Create face-down sprite at position, then flip to face-up
    const sprite = this.makeCardSprite(card, tx, cy, false)
    // Set depth in the face-up band for this pile (ci=0, the first and only face-up card after reveal)
    sprite.setDepth(DEPTH_CARDS + 200 + ti * 20 + 0)
    sprite.setData('tableauIndex', ti)
    sprite.setData('activeIndex', 0)

    // Flip animation: collapse X → swap texture → expand X back to correct scale
    this.tweens.add({
      targets: sprite,
      scaleX: 0,
      duration: FLIP_DURATION / 2,
      ease: 'Linear',
      onComplete: () => {
        sprite.setTexture(cardToKey(card))
        sprite.setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
        sprite.setData('faceUp', true)
        // Read the scaleX that setDisplaySize established (texture-dependent)
        const targetScaleX = sprite.scaleX
        sprite.scaleX = 0
        this.tweens.add({
          targets: sprite,
          scaleX: targetScaleX,
          duration: FLIP_DURATION / 2,
          ease: 'Linear',
          onComplete: () => {
            this.cardSprites.set(card.toString(), sprite)
            this.setupTableauDrag(ti)
            this.setupTableauReveal(ti)
            this.updateMoveCountDisplay()
            this.animating = false
          },
        })
      },
    })
  }

  // ─── Tableau drag ──────────────────────────────────────────────────────────

  private setupTableauDrag(ti: number) {
    const pile = this.cardGame.getTableauPile(ti)!
    const activeCards = [...pile]
    if (activeCards.length === 0) return

    // The entire active run is draggable as a group
    // We attach drag to the bottom-most (back) card — the visible one
    // The player drags the whole run from that card downward
    const activeStart = pile.hiddenRemaining() * TAB_HIDDEN_OFFSET

    for (let ci = 0; ci < activeCards.length; ci++) {
      const card = activeCards[ci]
      const sprite = this.cardSprites.get(card.toString())
      if (!sprite) continue
      sprite.setInteractive()
      sprite.removeAllListeners()

      const captureIndex = ci   // which card in the run was grabbed
      sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.animating) return
        // Build the run from captureIndex to end
        const runCards = [...activeCards]  // always drag the entire face-up run
        const runSprites = runCards.map(c => this.cardSprites.get(c.toString())!).filter(Boolean)
        if (runSprites.length === 0) return

        const offsetX = runSprites.map(s => pointer.x - s.x)
        const offsetY = runSprites.map(s => pointer.y - s.y)
        const originX = runSprites.map(s => s.x)
        const originY = runSprites.map(s => s.y)
        const originDepth = runSprites.map(s => s.depth)

        runSprites.forEach((s, idx) => {
          s.setDepth(DEPTH_DRAGGING + idx)
          this.children.bringToTop(s)
        })

        this.drag = {
          cards: runSprites,
          sourceType: 'tableau',
          sourceIndex: ti,
          engineCards: runCards,
          offsetX,
          offsetY,
          originX,
          originY,
          originDepth,
        }
      })
    }
  }

  // ─── Stock interaction ─────────────────────────────────────────────────────

  private setupStockInteraction() {
    const stock = [...this.cardGame.getStockPile()]
    if (stock.length === 0) return

    // Top card of stock is the last in the fan (highest ci)
    const topIndex = stock.length - 1
    const topCard = stock[topIndex]
    const topKey = topCard.toString() + '_stock_' + topIndex
    const topSprite = this.cardSprites.get(topKey)
    if (!topSprite) return

    topSprite.setInteractive()

    topSprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.animating) return
      this.pointerDownPos = { x: pointer.x, y: pointer.y }

      const offsetX = pointer.x - topSprite.x
      const offsetY = pointer.y - topSprite.y
      const originDepth = topSprite.depth

      topSprite.setDepth(DEPTH_DRAGGING)
      this.children.bringToTop(topSprite)

      this.drag = {
        cards: [topSprite],
        sourceType: 'stock',
        sourceIndex: 0,
        engineCards: [topCard],
        offsetX: [offsetX],
        offsetY: [offsetY],
        originX: [topSprite.x],
        originY: [topSprite.y],
        originDepth: [originDepth],
      }
    })
  }

  // ─── Stock pile click: auto-move top card to score pile ───────────────────

  private handleStockClick(drag: DragState) {
    this.drag = null
    const sprite = drag.cards[0]

    // Restore depth while we attempt the move
    sprite.setDepth(DEPTH_CARDS)

    try {
      this.cardGame.makeMove(Moves.StockPileToScorePile())
    } catch {
      // Move not valid — card stays in stock, nothing to animate
      return
    }

    // Move succeeded — animate the card flying to its score pile destination
    this.sound.play('card-playing')
    this.animating = true
    const scoreCards = [...this.cardGame.getScorePile()]
    const newCount = scoreCards.length
    const destX = this.scoreCardX(newCount - 1, newCount)
    const destY = SCORE_Y

    // Flip the card face-up while it travels
    sprite.setDepth(DEPTH_DRAGGING)
    this.tweens.add({
      targets: sprite,
      x: destX,
      y: destY,
      duration: SNAP_DURATION,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.animating = false
        this.fullRedraw()
      },
    })
  }

  // ─── Score pile render ─────────────────────────────────────────────────────

  // Compute horizontal x position for a card in the score pile fan.
  // Cards fan left-to-right from SCORE_LEFT_X; oldest card is leftmost (ci=0), newest is rightmost.
  // Offset compresses dynamically so all cards always fit within SCORE_LEFT_X..SCORE_RIGHT_X.
  private scoreCardX(ci: number, count: number): number {
    if (count <= 1) return SCORE_LEFT_X
    const offset = Math.min(SCORE_MAX_OFFSET, (SCORE_RIGHT_X - SCORE_LEFT_X) / (count - 1))
    return SCORE_LEFT_X + ci * offset
  }

  private renderScorePile() {
    // Remove old score sprites
    for (const [key, sprite] of this.cardSprites) {
      if (key.startsWith('score_')) {
        sprite.destroy()
        this.cardSprites.delete(key)
      }
    }

    const scoreCards = [...this.cardGame.getScorePile()]
    const count = scoreCards.length

    for (let ci = 0; ci < count; ci++) {
      const card = scoreCards[ci]
      const cx = this.scoreCardX(ci, count)
      const sprite = this.makeCardSprite(card, cx, SCORE_Y, true)
      sprite.setData('scoreIndex', ci)
      this.cardSprites.set(`score_${ci}_${card.toString()}`, sprite)
    }
  }

  private setupScoreInteraction() {
    const scoreCards = [...this.cardGame.getScorePile()]
    const count = scoreCards.length
    if (count === 0) return

    scoreCards.forEach((card, ci) => {
      const key = `score_${ci}_${card.toString()}`
      const sprite = this.cardSprites.get(key)
      if (!sprite) return
      sprite.setInteractive()

      sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.animating) return
        const offsetX = pointer.x - sprite.x
        const offsetY = pointer.y - sprite.y
        const originDepth = sprite.depth

        sprite.setDepth(DEPTH_DRAGGING)
        this.children.bringToTop(sprite)

        this.drag = {
          cards: [sprite],
          sourceType: 'score',
          sourceIndex: ci,
          engineCards: [card],
          offsetX: [offsetX],
          offsetY: [offsetY],
          originX: [sprite.x],
          originY: [sprite.y],
          originDepth: [originDepth],
        }
      })
    })
  }

  // ─── Global pointer move/up handlers ──────────────────────────────────────

  override update() {
    // handled via event listeners set up in create
  }

  private setupInputHandlers() {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.drag) return
      this.drag.cards.forEach((sprite, i) => {
        sprite.x = pointer.x - this.drag!.offsetX[i]
        sprite.y = pointer.y - this.drag!.offsetY[i]
      })
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.drag) return

      // Detect a click on the stock pile: pointer hasn't moved significantly
      const downPos = this.pointerDownPos
      this.pointerDownPos = null
      if (
        this.drag.sourceType === 'stock' &&
        downPos &&
        Math.abs(pointer.x - downPos.x) < 8 &&
        Math.abs(pointer.y - downPos.y) < 8
      ) {
        this.handleStockClick(this.drag)
        return
      }

      this.handleDrop(pointer)
    })
  }

  // ─── Drop handling ────────────────────────────────────────────────────────

  private handleDrop(pointer: Phaser.Input.Pointer) {
    if (!this.drag) return
    const drag = this.drag
    this.drag = null

    const target = this.findDropTarget(pointer.x, pointer.y, drag)
    if (!target) {
      this.animateReturn(drag)
      return
    }

    // Try to make the engine move
    try {
      const move = this.buildMove(drag, target)
      if (!move) throw new Error('No move available')
      this.cardGame.makeMove(move)
      // Move succeeded — play sound then animate
      if (drag.sourceType === 'tableau' && drag.cards.length >= 3) {
        this.sound.play('cards-playing')
      } else {
        this.sound.play('card-playing')
      }
      if (target.type === 'foundation') {
        // Foundation merges have their own dedicated animation (staggered, direction-aware)
        this.animateFoundationMerge(drag, target.index, () => {
          this.fullRedraw()
        })
      } else if (
        target.type === 'tableau' &&
        (drag.sourceType === 'stock' || drag.sourceType === 'score') &&
        [...this.cardGame.getTableauPile(target.index)!].length === drag.cards.length
      ) {
        // Stock or score card dropped onto a previously empty tableau pile.
        // Snap to the final position then flip face-up in-place, so the card
        // lands at exactly the position fullRedraw() will use — no visible jump.
        const actualTarget = this.computeActualTarget(drag, target)
        this.animateSnapThenFlip(drag, actualTarget, () => {
          this.fullRedraw()
        })
      } else {
        // For all other targets, snap the dragged sprites to their final positions
        const actualTarget = this.computeActualTarget(drag, target)
        this.animateSnap(drag, actualTarget, () => {
          this.fullRedraw()
        })
      }
    } catch (e) {
      // Illegal move — animate cards back
      this.animateReturn(drag)
    }
  }

  // Compute the true destination coordinates for the dragged card(s) after the engine
  // move has already been applied, so the snap animation ends at the same position
  // that fullRedraw() will place the sprites (eliminating the two-movement jump).
  private computeActualTarget(drag: DragState, nominal: PileTarget): PileTarget {
    if (nominal.type === 'foundation') {
      const pile = this.cardGame.getFoundationPile(nominal.index)!
      const cards = [...pile]
      const droppedCard = drag.engineCards[0]
      // Find the actual index of the dropped card — it may have been inserted at the left
      const droppedIndex = cards.findIndex(c => c.toString() === droppedCard.toString())
      const x = foundationX(nominal.index) + droppedIndex * FOUND_HORIZ_OFFSET
      return { ...nominal, x, y: FOUND_Y }
    }

    if (nominal.type === 'tableau') {
      const pile = this.cardGame.getTableauPile(nominal.index)!
      const hiddenCount = pile.hiddenRemaining()
      const activeCards = [...pile]
      const activeStart = hiddenCount * TAB_HIDDEN_OFFSET
      // The first card of the dropped run lands at index (activeCards.length - drag.cards.length)
      const firstDroppedActiveIndex = activeCards.length - drag.cards.length
      const y = TAB_Y + activeStart + firstDroppedActiveIndex * TAB_FACE_OFFSET
      return { ...nominal, x: tableauX(nominal.index), y }
    }

    if (nominal.type === 'score') {
      const scoreCards = [...this.cardGame.getScorePile()]
      const newCount = scoreCards.length
      const x = this.scoreCardX(newCount - 1, newCount)
      return { ...nominal, x, y: SCORE_Y }
    }

    return nominal
  }

  private buildMove(drag: DragState, target: PileTarget) {
    const { sourceType, sourceIndex, engineCards } = drag

    if (sourceType === 'stock') {
      if (target.type === 'score') return Moves.StockPileToScorePile()
      if (target.type === 'tableau') return Moves.StockPileToTableauPile(target.index)
    }

    if (sourceType === 'tableau') {
      if (target.type === 'tableau') return Moves.TableauPileToTableauPile(sourceIndex, target.index)
      if (target.type === 'foundation') return Moves.TableauPileToFoundationPile(sourceIndex, target.index)
      if (target.type === 'score') return Moves.TableauPileToScorePile(sourceIndex)
    }

    if (sourceType === 'score') {
      const card = engineCards[0]
      if (target.type === 'tableau') return Moves.ScorePileToTableauPile(card, target.index)
      if (target.type === 'foundation') return Moves.ScorePileToFoundationPile(card, target.index)
    }

    return null
  }

  private findDropTarget(px: number, py: number, drag: DragState): PileTarget | null {
    const hw = CARD_WIDTH / 2 + 50
    const hh = CARD_HEIGHT / 2 + 50

    // Use the actual top-card position (not the cursor) for vertical hit tests.
    // When dragging a multi-card run, the cursor may be far below the top card,
    // so testing topCardY gives accurate placement regardless of run length.
    const topCardY = py - drag.offsetY[0]

    // Check foundation piles — hit zone covers the entire fan plus padding on all sides
    for (let i = 0; i < 4; i++) {
      const fx = foundationX(i)
      const pile = this.cardGame.getFoundationPile(i)!
      const cards = [...pile]
      const lastX = fx + Math.max(0, cards.length - 1) * FOUND_HORIZ_OFFSET
      // Fan spans from fx (first card) to lastX (last card); add padding on each side.
      // Vertical padding is kept tight (10px) so the zone doesn't bleed into the tableau row.
      const fanLeft = fx - CARD_WIDTH / 2 - 20
      const rawFanRight = lastX + CARD_WIDTH / 2 + 20
      const nextPileLeft = i < 3 ? foundationX(i + 1) - CARD_WIDTH / 2 - 20 : Infinity
      const fanRight = Math.min(rawFanRight, nextPileLeft - 4)
      if (px >= fanLeft && px <= fanRight && Math.abs(topCardY - FOUND_Y) <= CARD_HEIGHT / 2 + 10) {
        return { type: 'foundation', index: i, x: lastX, y: FOUND_Y }
      }
    }

    // Check tableau piles — hit zone covers entire column width + padding, full height + padding
    for (let i = 0; i < 7; i++) {
      const tx = tableauX(i)
      const pile = this.cardGame.getTableauPile(i)!
      const activeCards = [...pile]
      const hiddenCount = pile.hiddenRemaining()
      const activeStart = hiddenCount * TAB_HIDDEN_OFFSET
      let targetY: number

      if (activeCards.length > 0) {
        targetY = TAB_Y + activeStart + (activeCards.length - 1) * TAB_FACE_OFFSET
      } else {
        targetY = TAB_Y + (hiddenCount > 0 ? (hiddenCount - 1) * TAB_HIDDEN_OFFSET : 0)
      }

      // Tall hit zone covering the whole pile column with generous padding.
      // topCardY is used for the vertical check so that dropping a large run works
      // correctly even when the cursor is far below the top card of the dragged run.
      const totalCardsH = activeStart + Math.max(0, activeCards.length - 1) * TAB_FACE_OFFSET
      const pileH = Math.max(CARD_HEIGHT, totalCardsH + CARD_HEIGHT) + 40
      const pileTop = TAB_Y - CARD_HEIGHT / 2 - 20
      const pileBottom = pileTop + pileH

      if (Math.abs(px - tx) <= hw && topCardY >= pileTop && topCardY <= pileBottom) {
        return { type: 'tableau', index: i, x: tx, y: targetY }
      }
    }

    // Check score pile — wide hit zone covering the full horizontal fan area
    const scoreLeft = SCORE_LEFT_X - CARD_WIDTH / 2 - 20
    const scoreRight = SCORE_RIGHT_X + CARD_WIDTH / 2 + 20
    if (px >= scoreLeft && px <= scoreRight && Math.abs(py - SCORE_Y) <= hh + 20) {
      // Target x is the position where the next card would go
      const scoreCards = [...this.cardGame.getScorePile()]
      const nextCount = scoreCards.length + 1
      const targetX = this.scoreCardX(scoreCards.length, nextCount)
      return { type: 'score', index: 0, x: targetX, y: SCORE_Y }
    }

    return null
  }

  // ─── Animations ────────────────────────────────────────────────────────────

  private animateReturn(drag: DragState) {
    this.animating = true
    let completed = 0
    drag.cards.forEach((sprite, i) => {
      this.tweens.add({
        targets: sprite,
        x: drag.originX[i],
        y: drag.originY[i],
        duration: RETURN_DURATION,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          sprite.setDepth(drag.originDepth[i])
          completed++
          if (completed === drag.cards.length) {
            this.animating = false
          }
        },
      })
    })
  }

  // ─── Foundation merge animation ───────────────────────────────────────────
  //
  // Four cases, all handled here:
  //   Right-side (single/multi): incoming cards fly in one-by-one, left→right, staggered.
  //   Left-side  (single/multi): existing cards slide right simultaneously; incoming cards
  //                              fly in one-by-one, left→right, staggered.

  private animateFoundationMerge(drag: DragState, fi: number, onDone: () => void) {
    this.animating = true

    const pile = this.cardGame.getFoundationPile(fi)!
    const cards = [...pile]
    const N = drag.cards.length
    const fBaseX = foundationX(fi)

    // Look up the true post-merge index for each incoming card individually.
    // This is necessary because the engine may iterate the incoming run in reverse
    // (when forward=false), meaning drag.engineCards[0] is not necessarily the
    // leftmost of the inserted cards.
    const finalIndices = drag.engineCards.map(ec =>
      cards.findIndex(c => c.toString() === ec.toString())
    )

    // Left-side insertion: the incoming cards collectively occupy the leftmost slots
    // and there were already cards in the pile before this merge.
    const minFinalIndex = Math.min(...finalIndices)
    const isLeft = minFinalIndex === 0 && N < cards.length

    // Existing sprites that need to slide right (left-side only).
    // They now live at indices N..cards.length-1 in the post-merge pile.
    const existingSprites: Phaser.GameObjects.Image[] = []
    if (isLeft) {
      for (let ci = N; ci < cards.length; ci++) {
        const s = this.cardSprites.get(cards[ci].toString())
        if (s) existingSprites.push(s)
      }
    }

    // Full duration of the staggered sequence, so existing sprites finish sliding
    // at the same moment the last incoming card lands.
    const totalDuration = (N - 1) * FOUND_STAGGER + SNAP_DURATION

    const totalTweens = N + existingSprites.length
    let completed = 0
    const done = () => {
      completed++
      if (completed === totalTweens) {
        this.animating = false
        onDone()
      }
    }

    // Existing sprites drift right continuously over the full animation window (left-side only).
    // This keeps them in sync with the staggered incoming cards so each new card appears
    // to slot in as the pile makes room, rather than the pile jumping away first.
    existingSprites.forEach((sprite, j) => {
      sprite.setDepth(DEPTH_CARDS + N + j)
      this.tweens.add({
        targets: sprite,
        x: fBaseX + (N + j) * FOUND_HORIZ_OFFSET,
        duration: totalDuration,
        ease: 'Sine.easeOut',
        onComplete: done,
      })
    })

    // Sort incoming cards so that the one landing closest to the pile edge goes first:
    //   right-side → ascending finalIndex (lowest index = adjacent to existing right end)
    //   left-side  → descending finalIndex (highest index = adjacent to existing left end)
    const order = drag.cards
      .map((sprite, i) => ({ sprite, finalIndex: finalIndices[i] }))
      .sort((a, b) => isLeft ? b.finalIndex - a.finalIndex : a.finalIndex - b.finalIndex)

    order.forEach(({ sprite, finalIndex }, staggerStep) => {
      sprite.setDepth(DEPTH_CARDS + finalIndex)
      this.tweens.add({
        targets: sprite,
        x: fBaseX + finalIndex * FOUND_HORIZ_OFFSET,
        y: FOUND_Y,
        duration: SNAP_DURATION,
        delay: staggerStep * FOUND_STAGGER,
        ease: 'Sine.easeOut',
        onComplete: done,
      })
    })
  }

  private animateSnap(drag: DragState, target: PileTarget, onDone: () => void) {
    this.animating = true
    const N = drag.cards.length
    let completed = 0
    const done = () => {
      completed++
      if (completed === N) {
        this.animating = false
        onDone()
      }
    }

    if (target.type === 'tableau') {
      // Look up each dropped card's final position in the post-merge pile so we can
      // animate in the correct order — deepest card first — regardless of whether the
      // engine reversed the merge direction (e.g. [7c,8c] onto [10c,9c]).
      const pile = this.cardGame.getTableauPile(target.index)!
      const activeCards = [...pile]
      const hiddenCount = pile.hiddenRemaining()
      const baseY = TAB_Y + hiddenCount * TAB_HIDDEN_OFFSET

      const order = drag.cards
        .map((sprite, i) => {
          const ec = drag.engineCards[i]
          const finalIndex = activeCards.findIndex(c => c.toString() === ec.toString())
          return { sprite, finalIndex }
        })
        // Deepest card (highest finalIndex) animates first so each card lands on top
        // of the one that is already settled — mirrors animateFoundationMerge logic.
        .sort((a, b) => b.finalIndex - a.finalIndex)

      order.forEach(({ sprite, finalIndex }, staggerStep) => {
        sprite.setDepth(DEPTH_CARDS + 200 + target.index * 20 + finalIndex)
        this.tweens.add({
          targets: sprite,
          x: tableauX(target.index),
          y: baseY + finalIndex * TAB_FACE_OFFSET,
          duration: SNAP_DURATION,
          delay: staggerStep * TAB_STAGGER,
          ease: 'Sine.easeOut',
          onComplete: done,
        })
      })
      return
    }

    // Non-tableau targets (score, etc.) — single card, no stagger needed.
    drag.cards.forEach((sprite) => {
      this.tweens.add({
        targets: sprite,
        x: target.x,
        y: target.y,
        duration: SNAP_DURATION,
        ease: 'Sine.easeOut',
        onComplete: done,
      })
    })
  }

  // ─── Snap + flip animation (stock/score → empty tableau) ──────────────────
  //
  // Snaps the face-down card to its final position, then flips it face-up
  // in-place. This ensures the card lands at exactly the coordinate that
  // fullRedraw() will use, eliminating any visible jump on texture swap.

  private animateSnapThenFlip(drag: DragState, target: PileTarget, onDone: () => void) {
    this.animating = true
    const sprite = drag.cards[0]
    const card = drag.engineCards[0]

    this.tweens.add({
      targets: sprite,
      x: target.x,
      y: target.y,
      duration: SNAP_DURATION,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (drag.sourceType === 'score') {
          // Already face-up — no flip needed
          this.animating = false
          onDone()
        } else {
          // Flip in-place: collapse → swap texture → expand (mirrors deal + reveal animations)
          this.tweens.add({
            targets: sprite,
            scaleX: 0,
            duration: FLIP_DURATION / 2,
            ease: 'Linear',
            onComplete: () => {
              sprite.setTexture(cardToKey(card))
              sprite.setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
              const targetScaleX = sprite.scaleX
              sprite.scaleX = 0
              this.tweens.add({
                targets: sprite,
                scaleX: targetScaleX,
                duration: FLIP_DURATION / 2,
                ease: 'Linear',
                onComplete: () => {
                  this.animating = false
                  onDone()
                },
              })
            },
          })
        }
      },
    })
  }

  // ─── Deal animation ────────────────────────────────────────────────────────

  // Sets up all card sprites on the stock pile ready to deal, then returns a
  // startDeal callback that — when called — fires the tweens and deal sound
  // together. Separating setup from start lets the caller gate the animation
  // behind a user gesture so the browser's autoplay policy is satisfied and
  // the sound always plays in sync with the first card flying.
  private dealAnimation(): () => void {
    this.animating = true

    // Snapshot the initial game state:
    // We need to know which cards go to which tableau pile and in which order.
    // The game is already initialized. We rebuild once without animation, hidden,
    // then animate each card flying from stock to tableau.

    // First, fully rebuild all sprites at their final positions, but invisible
    this.rebuildAllSprites(false)

    // Collect tableau cards with final positions for animation
    type DealCard = { sprite: Phaser.GameObjects.Image; finalX: number; finalY: number; delay: number; isTop: boolean; card: Card; tableauIndex: number }
    const dealCards: DealCard[] = []

    let delay = 0
    for (let ti = 0; ti < 7; ti++) {
      const pile = this.cardGame.getTableauPile(ti)!
      const hiddenCount = pile.hiddenRemaining()
      const activeCards = [...pile]

      // Hidden cards
      for (let hi = 0; hi < hiddenCount; hi++) {
        const key = `hidden_${ti}_${hi}`
        const sprite = this.cardSprites.get(key)
        if (!sprite) continue
        const finalX = sprite.x
        const finalY = sprite.y
        sprite.setAlpha(0)
        dealCards.push({ sprite, finalX, finalY, delay, isTop: false, card: null as unknown as Card, tableauIndex: ti })
        delay += DEAL_STAGGER
      }

      // Active (face-up) cards — one per tableau at start
      for (let ci = 0; ci < activeCards.length; ci++) {
        const card = activeCards[ci]
        const sprite = this.cardSprites.get(card.toString())
        if (!sprite) continue
        const finalX = sprite.x
        const finalY = sprite.y
        sprite.setAlpha(0)
        // The face-up card will animate in face-down then flip
        sprite.setTexture(CARD_BACK_KEY)
        sprite.setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
        dealCards.push({ sprite, finalX, finalY, delay, isTop: true, card, tableauIndex: ti })
        delay += DEAL_STAGGER
      }
    }

    // Run deal animations
    let completed = 0
    const total = dealCards.length

    if (total === 0) {
      // Nothing to deal — return a no-op that immediately unlocks the game.
      return () => {
        this.animating = false
        this.setupInputHandlers()
        this.setupAllInteractions()
      }
    }

    // The stock pile currently holds the remaining (undealt) cards.
    // We want to visually start with all cards stacked — the undealt stock cards
    // at the bottom, and the 'total' dealt cards stacked on top of them.
    // Card i in dealCards sits at position (stockSize + total - 1 - i) from the bottom.
    const stockSize = [...this.cardGame.getStockPile()].length
    const fullPileSize = stockSize + total

    // Position each dealt card at its correct height in the initial full pile,
    // then make it visible so it appears as part of the stack.
    // Card i=0 is dealt first and sits at the top, so it gets the highest depth.
    dealCards.forEach((dc, i) => {
      const stackIndex = fullPileSize - 1 - i   // 0 = bottom of pile, higher = closer to top
      dc.sprite.x = STOCK_X
      dc.sprite.y = STOCK_Y - stackIndex * STOCK_OFFSET
      dc.sprite.setAlpha(1)
      dc.sprite.setTexture(CARD_BACK_KEY)
      dc.sprite.setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
      dc.sprite.setDepth(DEPTH_CARDS + (total - i))  // card 0 on top, card (total-1) just above stock
    })

    // Return a callback that starts the tweens and sound together.
    // Called by create() only after the user's first pointer interaction,
    // which satisfies the browser autoplay policy so the sound always plays.
    return () => {
      this.sound.play('cards-dealing')

      dealCards.forEach((dc) => {
        this.time.delayedCall(dc.delay, () => {
          // The sprite is already visible and positioned at the top of the shrinking pile.
          // Bring it to the front so it renders above everything while flying.
          dc.sprite.setDepth(DEPTH_DRAGGING)
          this.tweens.add({
            targets: dc.sprite,
            x: dc.finalX,
            y: dc.finalY,
            duration: DEAL_DURATION,
            ease: 'Cubic.easeOut',
            onComplete: () => {
              dc.sprite.setDepth(DEPTH_CARDS)
              if (dc.isTop && dc.card) {
                // Flip the top card face-up
                this.tweens.add({
                  targets: dc.sprite,
                  scaleX: 0,
                  duration: FLIP_DURATION / 2,
                  ease: 'Linear',
                  onComplete: () => {
                    dc.sprite.setTexture(cardToKey(dc.card))
                    dc.sprite.setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
                    // Read the scaleX that setDisplaySize established (texture-dependent)
                    const targetScaleX = dc.sprite.scaleX
                    dc.sprite.scaleX = 0
                    this.tweens.add({
                      targets: dc.sprite,
                      scaleX: targetScaleX,
                      duration: FLIP_DURATION / 2,
                      ease: 'Linear',
                      onComplete: () => {
                        completed++
                        if (completed === total) {
                          this.animating = false
                          this.setupInputHandlers()
                          this.setupAllInteractions()
                          this.startTimer()
                        }
                      },
                    })
                  },
                })
              } else {
                completed++
                if (completed === total) {
                  this.animating = false
                  this.setupInputHandlers()
                  this.setupAllInteractions()
                  this.startTimer()
                }
              }
            },
          })
        })
      })
    }
  }

  // ─── Setup all interactions after deal / after redraw ─────────────────────

  private setupAllInteractions() {
    for (let ti = 0; ti < 7; ti++) {
      this.setupTableauReveal(ti)
      this.setupTableauDrag(ti)
    }
    this.setupStockInteraction()
    this.setupScoreInteraction()
  }

  // ─── Game timer ───────────────────────────────────────────────────────────

  private startTimer() {
    this.elapsedSeconds = 0
    this.updateTimerDisplay()
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.elapsedSeconds++
        this.updateTimerDisplay()
      },
    })
  }

  private updateMoveCountDisplay() {
    this.moveCountText.setText(String(this.cardGame.getMoveCount()))
  }

  private updateTimerDisplay() {
    const m = Math.floor(this.elapsedSeconds / 60)
    const s = this.elapsedSeconds % 60
    this.timerText.setText(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
  }

  // ─── Full redraw after a move ──────────────────────────────────────────────

  private fullRedraw() {
    // Build the set of card keys currently in foundation piles — these sprites are preserved
    // so that cards already placed don't visually jump when a new card is inserted.
    const foundationKeys = new Set<string>()
    for (let fi = 0; fi < 4; fi++) {
      for (const card of this.cardGame.getFoundationPile(fi)!) {
        foundationKeys.add(card.toString())
      }
    }

    // Destroy all non-foundation sprites
    for (const [key, sprite] of this.cardSprites) {
      if (!foundationKeys.has(key)) {
        sprite.destroy()
      }
    }
    // Keep only the foundation sprites in the map; everything else is rebuilt below
    this.cardSprites = new Map([...this.cardSprites].filter(([k]) => foundationKeys.has(k)))

    // Foundation cards are never draggable — strip any leftover interactivity from sprites
    // that were previously tableau/score cards and got preserved after a successful move.
    for (const [, sprite] of this.cardSprites) {
      sprite.disableInteractive()
      sprite.removeAllListeners()
    }

    // Re-render everything from engine state
    this.rebuildFromEngineState()
    this.setupAllInteractions()
    this.updateScoreDisplay()
    this.updateMoveCountDisplay()

    // Check for win — launch WinScene as an overlay on top of GameScene
    if (this.cardGame.finished()) {
      this.timerEvent?.remove()
      this.timerEvent = null
      const elapsed = this.elapsedSeconds
      this.time.delayedCall(400, () => {
        this.scene.launch('WinScene', { score: this.cardGame.getScore(), elapsed, moveCount: this.cardGame.getMoveCount() })
      })
    }
  }

  private rebuildFromEngineState() {
    // Foundation piles — preserve existing sprites so cards don't jump position.
    // Only create a sprite for cards that have no existing sprite (newly added cards).
    // The newly added card's position is determined by its index in the pile iterator,
    // which correctly reflects whether it was inserted at the left or right end.
    for (let fi = 0; fi < 4; fi++) {
      const pile = this.cardGame.getFoundationPile(fi)!
      const cards = [...pile]

      // Create sprites for any cards not yet in the map (newly arrived cards)
      for (let ci = 0; ci < cards.length; ci++) {
        const card = cards[ci]
        if (this.cardSprites.has(card.toString())) {
          // Sprite already exists — ensure it carries no leftover interactivity
          const existing = this.cardSprites.get(card.toString())!
          existing.disableInteractive()
          existing.removeAllListeners()
          continue
        }
        const cx = foundationX(fi) + ci * FOUND_HORIZ_OFFSET
        const sprite = this.makeCardSprite(card, cx, FOUND_Y, true)
        this.cardSprites.set(card.toString(), sprite)
      }

      // Reposition every sprite in this pile to its correct index-based X.
      // This is necessary when cards are inserted on the left side of the pile
      // (shifting all existing cards right) as well as to enforce correct depth ordering.
      for (let ci = 0; ci < cards.length; ci++) {
        const sprite = this.cardSprites.get(cards[ci].toString())
        if (!sprite) continue
        sprite.setX(foundationX(fi) + ci * FOUND_HORIZ_OFFSET)
        sprite.setDepth(DEPTH_CARDS + ci)
      }
    }

    // Tableau piles
    for (let ti = 0; ti < 7; ti++) {
      const pile = this.cardGame.getTableauPile(ti)!
      const tx = tableauX(ti)
      const hiddenCount = pile.hiddenRemaining()

      // Hidden cards — lower depth band: DEPTH_CARDS + ti*20 + hi
      for (let hi = 0; hi < hiddenCount; hi++) {
        const cy = TAB_Y + hi * TAB_HIDDEN_OFFSET
        const sprite = this.add.image(tx, cy, CARD_BACK_KEY)
        sprite.setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
        sprite.setDepth(DEPTH_CARDS + ti * 20 + hi)
        sprite.setData('hidden', true)
        sprite.setData('tableauIndex', ti)
        this.cardSprites.set(`hidden_${ti}_${hi}`, sprite)
      }

      // Active (face-up) cards — higher depth band: DEPTH_CARDS + 200 + ti*20 + ci
      // Starting at +200 guarantees all face-up cards are always above all hidden cards
      const activeCards = [...pile]
      const activeStart = hiddenCount * TAB_HIDDEN_OFFSET
      for (let ci = 0; ci < activeCards.length; ci++) {
        const card = activeCards[ci]
        const cy = TAB_Y + activeStart + ci * TAB_FACE_OFFSET
        const sprite = this.makeCardSprite(card, tx, cy, true)
        sprite.setDepth(DEPTH_CARDS + 200 + ti * 20 + ci)
        sprite.setData('tableauIndex', ti)
        sprite.setData('activeIndex', ci)
        this.cardSprites.set(card.toString(), sprite)
      }
    }

    // Stock pile
    const stock = [...this.cardGame.getStockPile()]
    for (let ci = 0; ci < stock.length; ci++) {
      const card = stock[ci]
      const cy = STOCK_Y - ci * STOCK_OFFSET
      const sprite = this.makeCardSprite(card, STOCK_X, cy, false)
      this.cardSprites.set(card.toString() + '_stock_' + ci, sprite)
    }

    // Score pile
    this.renderScorePile()
  }

  private updateScoreDisplay() {
    this.scoreText.setText(this.cardGame.getScore().toString())
  }

  // ─── Restart ───────────────────────────────────────────────────────────────

  private restartGame() {
    // Signal to create() that audio is already unlocked so it can skip the
    // tap-to-start overlay and begin dealing immediately.
    this.scene.restart({ fromRestart: true })
  }

  // ─── Attribution ──────────────────────────────────────────────────────────

  private drawAttribution() {
    this.add.text(CANVAS_W - 8, CANVAS_H - 6, 'Background image by freepik (magnific.com)', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#ffffff',
    }).setOrigin(1, 1).setDepth(DEPTH_UI).setAlpha(0.28)
  }
}

// ─── Pure layout helpers ─────────────────────────────────────────────────────

function foundationX(index: number): number {
  return FOUND_START_X + index * FOUND_SPACING
}

function tableauX(index: number): number {
  return TAB_START_X + index * TAB_SPACING
}

