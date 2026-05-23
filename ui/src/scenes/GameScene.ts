import Phaser from 'phaser'
import { Game as CardGame, Moves, Card } from 'engine'
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

// Score pile: bottom-right — cards fan horizontally left from the right anchor
// With 13 cards at SCORE_HORIZ_OFFSET each, fan spans 12*SCORE_HORIZ_OFFSET = 732px left of anchor.
const SCORE_HORIZ_OFFSET = 61         // px per card in horizontal fan (10px overlap = fully readable)
const SCORE_ANCHOR_X = CANVAS_W - 80  // rightmost card center
const SCORE_Y = CANVAS_H - 100

// Drag depths
const DEPTH_BACKGROUND = 0
const DEPTH_PILE_SLOTS = 1
const DEPTH_CARDS = 2
const DEPTH_DRAGGING = 50
const DEPTH_BANNER = 100
const DEPTH_UI = 101

// Animation durations (ms)
const DEAL_DURATION = 220
const DEAL_STAGGER = 60
const FLIP_DURATION = 180
const RETURN_DURATION = 280
const SNAP_DURATION = 240

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
}

export class GameScene extends Phaser.Scene {
  private cardGame!: CardGame

  // Visual card sprites: keyed by card toString()
  private cardSprites: Map<string, Phaser.GameObjects.Image> = new Map()

  // Pile slot outlines (ghost rectangles showing pile positions)
  private pileSlots: Phaser.GameObjects.Rectangle[] = []

  private scoreText!: Phaser.GameObjects.Text
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
    this.dealAnimation()
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
    // Dark blue banner bar
    const banner = this.add.rectangle(CANVAS_W / 2, BANNER_H / 2, CANVAS_W, BANNER_H, 0x0a1628)
    banner.setDepth(DEPTH_BANNER)

    // Thin accent line at banner bottom
    const accent = this.add.rectangle(CANVAS_W / 2, BANNER_H, CANVAS_W, 2, 0x1e6fa8)
    accent.setDepth(DEPTH_BANNER)

    // Hamburger menu (non-functional placeholder)
    const hamStyle = { fontFamily: 'Arial', fontSize: '26px', color: '#b0c4de' }
    const ham = this.add.text(28, BANNER_H / 2, '≡', hamStyle).setOrigin(0.5, 0.5)
    ham.setDepth(DEPTH_UI)
    ham.setInteractive({ useHandCursor: true })

    // Game title
    const titleStyle = { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#e8f4fd', fontStyle: 'bold' }
    this.add.text(CANVAS_W / 2, BANNER_H / 2, 'CARD GAME', titleStyle).setOrigin(0.5, 0.5).setDepth(DEPTH_UI)

    // Score label
    const scoreLabelStyle = { fontFamily: 'Arial', fontSize: '15px', color: '#7ab8d9' }
    this.add.text(CANVAS_W - 200, BANNER_H / 2, 'SCORE', scoreLabelStyle).setOrigin(0.5, 0.5).setDepth(DEPTH_UI)

    const scoreStyle = { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#4fc3f7', fontStyle: 'bold' }
    this.scoreText = this.add.text(CANVAS_W - 145, BANNER_H / 2, '0', scoreStyle).setOrigin(0, 0.5)
    this.scoreText.setDepth(DEPTH_UI)

    // Restart button
    const restartBg = this.add.rectangle(CANVAS_W - 52, BANNER_H / 2, 76, 36, 0x1a3e6e, 1)
    restartBg.setDepth(DEPTH_UI)
    restartBg.setInteractive({ useHandCursor: true })
    restartBg.setStrokeStyle(1.5, 0x4fc3f7)

    const restartText = this.add.text(CANVAS_W - 52, BANNER_H / 2, '↺ Restart', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#b0d8f5',
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

    // Score slot — full width of the maximum 13-card horizontal fan
    const scoreSlotW = CARD_WIDTH + 12 * SCORE_HORIZ_OFFSET
    const scoreSlotH = CARD_HEIGHT + 16
    // Right edge of slot aligns with right edge of anchor card; left edge covers leftmost possible card
    const scoreSlotX = SCORE_ANCHOR_X - scoreSlotW / 2 + CARD_WIDTH / 2
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

    // Hidden cards — lower depth so active cards render above
    const hiddenCount = pile.hiddenRemaining()
    for (let hi = 0; hi < hiddenCount; hi++) {
      const cy = TAB_Y + hi * TAB_HIDDEN_OFFSET
      const sprite = this.add.image(tx, cy, CARD_BACK_KEY)
      sprite.setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
      sprite.setDepth(DEPTH_CARDS + hi)
      sprite.setData('hidden', true)
      sprite.setData('tableauIndex', ti)
      this.cardSprites.set(`hidden_${ti}_${hi}`, sprite)
    }

    // Active (face-up) cards — higher depth, stacked above hidden
    const activeCards = [...pile]
    const activeStart = hiddenCount * TAB_HIDDEN_OFFSET
    for (let ci = 0; ci < activeCards.length; ci++) {
      const card = activeCards[ci]
      const cy = TAB_Y + activeStart + ci * TAB_FACE_OFFSET
      const sprite = this.makeCardSprite(card, tx, cy, true)
      sprite.setDepth(DEPTH_CARDS + hiddenCount + ci)
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
        topHiddenSprite.on('pointerover', () => topHiddenSprite.setAlpha(0.85))
        topHiddenSprite.on('pointerout', () => topHiddenSprite.setAlpha(1))
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
    // Set depth to sit above all remaining hidden cards (hiddenCount is post-reveal count)
    sprite.setDepth(DEPTH_CARDS + hiddenCount)
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
        const runCards = activeCards.slice(captureIndex)
        const runSprites = runCards.map(c => this.cardSprites.get(c.toString())!).filter(Boolean)
        if (runSprites.length === 0) return

        const offsetX = runSprites.map(s => pointer.x - s.x)
        const offsetY = runSprites.map(s => pointer.y - s.y)
        const originX = runSprites.map(s => s.x)
        const originY = runSprites.map(s => s.y)

        runSprites.forEach((s, idx) => s.setDepth(DEPTH_DRAGGING + idx))

        this.drag = {
          cards: runSprites,
          sourceType: 'tableau',
          sourceIndex: ti,
          engineCards: runCards,
          offsetX,
          offsetY,
          originX,
          originY,
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

      topSprite.setDepth(DEPTH_DRAGGING)

      this.drag = {
        cards: [topSprite],
        sourceType: 'stock',
        sourceIndex: 0,
        engineCards: [topCard],
        offsetX: [offsetX],
        offsetY: [offsetY],
        originX: [topSprite.x],
        originY: [topSprite.y],
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
  // Cards fan left from SCORE_ANCHOR_X; most-recent card is at the right (highest X).
  private scoreCardX(ci: number, count: number): number {
    // ci=0 is oldest (leftmost), ci=count-1 is newest (rightmost = anchor)
    return SCORE_ANCHOR_X - (count - 1 - ci) * SCORE_HORIZ_OFFSET
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
        sprite.setDepth(DEPTH_DRAGGING)

        this.drag = {
          cards: [sprite],
          sourceType: 'score',
          sourceIndex: ci,
          engineCards: [card],
          offsetX: [offsetX],
          offsetY: [offsetY],
          originX: [sprite.x],
          originY: [sprite.y],
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
      // Move succeeded — compute the exact final position from the updated engine state
      // so the snap animation lands precisely where fullRedraw() will place the card.
      const actualTarget = this.computeActualTarget(drag, target)
      this.animateSnap(drag, actualTarget, () => {
        this.fullRedraw()
      })
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
      const newCount = [...pile].length
      // The dropped card is now the last card in the pile
      const x = foundationX(nominal.index) + (newCount - 1) * FOUND_HORIZ_OFFSET
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
    const hw = CARD_WIDTH / 2 + 34
    const hh = CARD_HEIGHT / 2 + 34

    // Check foundation piles
    for (let i = 0; i < 4; i++) {
      const fx = foundationX(i)
      const pile = this.cardGame.getFoundationPile(i)!
      const lastX = fx + Math.max(0, [...pile].length - 1) * FOUND_HORIZ_OFFSET
      // Drop zone extends to cover the fan
      if (Math.abs(px - lastX) <= hw + 40 && Math.abs(py - FOUND_Y) <= hh) {
        return { type: 'foundation', index: i, x: lastX, y: FOUND_Y }
      }
    }

    // Check tableau piles
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

      // Tall hit zone covering the whole pile column
      const pileH = Math.max(CARD_HEIGHT, activeStart + activeCards.length * TAB_FACE_OFFSET + CARD_HEIGHT / 2)
      const pileTop = TAB_Y - CARD_HEIGHT / 2
      const pileBottom = pileTop + pileH

      if (Math.abs(px - tx) <= hw && py >= pileTop && py <= pileBottom) {
        return { type: 'tableau', index: i, x: tx, y: targetY }
      }
    }

    // Check score pile — wide hit zone covering the full horizontal fan area (up to 13 cards)
    const scoreFanW = 12 * SCORE_HORIZ_OFFSET + CARD_WIDTH
    const scoreLeft = SCORE_ANCHOR_X - scoreFanW
    const scoreRight = SCORE_ANCHOR_X + CARD_WIDTH / 2
    if (px >= scoreLeft && px <= scoreRight && Math.abs(py - SCORE_Y) <= hh + 20) {
      return { type: 'score', index: 0, x: SCORE_ANCHOR_X, y: SCORE_Y }
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
          sprite.setDepth(DEPTH_CARDS + drag.engineCards.length - i - 1)
          completed++
          if (completed === drag.cards.length) {
            this.animating = false
          }
        },
      })
    })
  }

  private animateSnap(drag: DragState, target: PileTarget, onDone: () => void) {
    this.animating = true
    let completed = 0
    drag.cards.forEach((sprite, i) => {
      const destX = target.x
      const destY = target.y + i * (drag.sourceType === 'tableau' ? TAB_FACE_OFFSET : 0)
      this.tweens.add({
        targets: sprite,
        x: destX,
        y: destY,
        duration: SNAP_DURATION,
        ease: 'Sine.easeOut',
        onComplete: () => {
          completed++
          if (completed === drag.cards.length) {
            this.animating = false
            onDone()
          }
        },
      })
    })
  }

  // ─── Deal animation ────────────────────────────────────────────────────────

  private dealAnimation() {
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
        sprite.x = STOCK_X
        sprite.y = STOCK_Y
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
        sprite.x = STOCK_X
        sprite.y = STOCK_Y
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
      this.animating = false
      this.setupInputHandlers()
      this.setupAllInteractions()
      return
    }

    dealCards.forEach((dc) => {
      this.time.delayedCall(dc.delay, () => {
        dc.sprite.setAlpha(1)
        this.tweens.add({
          targets: dc.sprite,
          x: dc.finalX,
          y: dc.finalY,
          duration: DEAL_DURATION,
          ease: 'Cubic.easeOut',
          onComplete: () => {
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
              }
            }
          },
        })
      })
    })
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

  // ─── Full redraw after a move ──────────────────────────────────────────────

  private fullRedraw() {
    // Destroy all card sprites
    for (const [, sprite] of this.cardSprites) {
      sprite.destroy()
    }
    this.cardSprites.clear()

    // Re-render everything from engine state
    this.rebuildFromEngineState()
    this.setupAllInteractions()
    this.updateScoreDisplay()

    // Check for win
    if (this.cardGame.finished()) {
      this.time.delayedCall(400, () => {
        this.scene.start('WinScene', { score: this.cardGame.getScore() })
      })
    }
  }

  private rebuildFromEngineState() {
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
      const tx = tableauX(ti)
      const hiddenCount = pile.hiddenRemaining()

      // Hidden cards — lower depth
      for (let hi = 0; hi < hiddenCount; hi++) {
        const cy = TAB_Y + hi * TAB_HIDDEN_OFFSET
        const sprite = this.add.image(tx, cy, CARD_BACK_KEY)
        sprite.setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
        sprite.setDepth(DEPTH_CARDS + hi)
        sprite.setData('hidden', true)
        sprite.setData('tableauIndex', ti)
        this.cardSprites.set(`hidden_${ti}_${hi}`, sprite)
      }

      // Active (face-up) cards — higher depth, above hidden
      const activeCards = [...pile]
      const activeStart = hiddenCount * TAB_HIDDEN_OFFSET
      for (let ci = 0; ci < activeCards.length; ci++) {
        const card = activeCards[ci]
        const cy = TAB_Y + activeStart + ci * TAB_FACE_OFFSET
        const sprite = this.makeCardSprite(card, tx, cy, true)
        sprite.setDepth(DEPTH_CARDS + hiddenCount + ci)
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
    this.scene.restart()
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

