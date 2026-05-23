import Phaser from 'phaser'
import { RULES_SECTIONS } from '../data/rulesText'

const CANVAS_W = 1280
const CANVAS_H = 720

const PANEL_W = 880
const PANEL_H = 620
const PANEL_X = CANVAS_W / 2
const PANEL_Y = CANVAS_H / 2

// Header zone height (title + divider + padding)
const HEADER_H = 58

// Scrollbar — sits in a reserved column on the right edge of the panel
const SCROLLBAR_W           = 6
const SCROLLBAR_TRACK_PAD   = 4    // vertical inset from viewport top/bottom
const SCROLLBAR_RIGHT_PAD   = 10   // gap between scrollbar centre and panel inner-right edge
const SCROLLBAR_COLUMN_W    = SCROLLBAR_W + SCROLLBAR_RIGHT_PAD + 6   // total reserved width = 22
const SCROLLBAR_THUMB_MIN_H = 32

// Content padding
// CONTENT_PAD_RIGHT folds in the scrollbar column so text wraps clear of the scrollbar track,
// while the scroll camera viewport stays at full panel width (no hard clip on the right).
const CONTENT_PAD_LEFT   = 36
const CONTENT_PAD_RIGHT  = 36 + SCROLLBAR_COLUMN_W   // 58 — symmetric feel + scrollbar gutter
const CONTENT_PAD_BOTTOM = 16

const FONT = 'Inter, Arial'
const DPR  = window.devicePixelRatio || 1

export class RulesScene extends Phaser.Scene {
  // Scroll state
  private scrollY      = 0
  private maxScrollY   = 0
  private contentH     = 0
  private viewportH    = 0

  // Scrollbar
  private scrollThumb!: Phaser.GameObjects.Rectangle
  private scrollTrackTopY = 0
  private scrollTrackH    = 0
  private thumbH          = 0
  private scrollbarVisible = false

  // Thumb drag
  private thumbDragging     = false
  private thumbDragStartY   = 0
  private thumbDragStartScroll = 0

  // Scroll camera (clips the content area)
  private scrollCam!: Phaser.Cameras.Scene2D.Camera

  // Objects rendered exclusively by the scroll camera
  private contentObjects: Phaser.GameObjects.GameObject[] = []

  // World-space origin for the scroll camera (X = panelLeft, Y = content top)
  private scrollOriginX = 0
  private contentWorldY = 0

  constructor() {
    super({ key: 'RulesScene' })
  }

  create() {
    this.scrollY       = 0
    this.contentObjects = []
    this.scrollbarVisible = false
    this.thumbDragging = false

    const panelLeft = PANEL_X - PANEL_W / 2
    const panelTop  = PANEL_Y - PANEL_H / 2
    this.scrollOriginX = panelLeft

    // Viewport (scroll area) sits inside the panel below the header.
    // Its width stops before the scrollbar column so the camera never
    // overlaps the scrollbar track/thumb.
    const viewportX = panelLeft
    const viewportY = panelTop + HEADER_H
    const viewportW = PANEL_W   // full panel width — scrollbar sits on main cam, no clip needed
    this.viewportH  = PANEL_H - HEADER_H - CONTENT_PAD_BOTTOM

    // ── Backdrop ──────────────────────────────────────────────────────────────
    const overlay = this.add.rectangle(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.72,
    )
    overlay.setDepth(0)
    overlay.setInteractive()
    overlay.on('pointerdown', () => this.close())

    // ── Panel ─────────────────────────────────────────────────────────────────
    const panel = this.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x0a1628, 0.97)
    panel.setStrokeStyle(2.5, 0x4fc3f7)
    panel.setDepth(1)
    panel.setInteractive()   // prevent backdrop clicks from passing through

    // ── Header chrome (structural, no text yet) ────────────────────────────────
    const headerY = panelTop + 32

    // Close button background — added now so it exists before fonts load
    const closeBtnX = PANEL_X + PANEL_W / 2 - 44
    const closeBtn  = this.add.rectangle(closeBtnX, headerY, 68, 30, 0x1a3e6e, 1)
    closeBtn.setStrokeStyle(1.5, 0x4fc3f7)
    closeBtn.setDepth(3)
    closeBtn.setInteractive({ useHandCursor: true })
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x1e5fa8))
    closeBtn.on('pointerout',  () => closeBtn.setFillStyle(0x1a3e6e))
    closeBtn.on('pointerdown', () => this.close())

    // ── Everything that needs a font waits here ────────────────────────────────
    document.fonts.ready.then(() => {
      // Title
      this.add.text(PANEL_X, headerY, 'RULES', {
        fontFamily: FONT,
        fontSize:   '22px',
        color:      '#4fc3f7',
        fontStyle:  'bold',
        resolution:  DPR,
      }).setOrigin(0.5, 0.5).setDepth(3)

      // Close button label
      this.add.text(closeBtnX, headerY, '✕ Close', {
        fontFamily: FONT,
        fontSize:   '13px',
        color:      '#b0d8f5',
        resolution:  DPR,
      }).setOrigin(0.5, 0.5).setDepth(4)

      // Divider
      this.add.rectangle(
        PANEL_X, panelTop + HEADER_H - 2, PANEL_W - 60, 1.5, 0x1e6fa8, 1,
      ).setDepth(3)

      // ── Content text ────────────────────────────────────────────────────────
      // Text is placed in world space starting at (viewportX + pad, contentWorldY + pad).
      // wrapWidth fills the viewport width minus symmetric padding.
      const contentLeft = viewportX + CONTENT_PAD_LEFT
      const wrapWidth   = viewportW - CONTENT_PAD_LEFT - CONTENT_PAD_RIGHT

      this.contentWorldY = viewportY
      let cursorY = this.contentWorldY + 10

      for (const section of RULES_SECTIONS) {
        const headingText = this.add.text(
          contentLeft, cursorY,
          section.heading.toUpperCase(),
          {
            fontFamily: FONT,
            fontSize:   '14px',
            color:      '#4fc3f7',
            fontStyle:  'bold',
            resolution:  DPR,
          },
        ).setOrigin(0, 0).setDepth(2)
        this.contentObjects.push(headingText)
        cursorY += headingText.height + 5

        const bodyText = this.add.text(
          contentLeft, cursorY,
          section.body,
          {
            fontFamily:  FONT,
            fontSize:    '13px',
            color:       '#c8dff0',
            wordWrap:    { width: wrapWidth, useAdvancedWrap: true },
            lineSpacing:  3,
            resolution:   DPR,
          },
        ).setOrigin(0, 0).setDepth(2)
        this.contentObjects.push(bodyText)
        cursorY += bodyText.height + 14
      }

      this.contentH  = cursorY - this.contentWorldY
      this.maxScrollY = Math.max(0, this.contentH - this.viewportH)

      // ── Scroll camera ────────────────────────────────────────────────────────
      // Viewport rectangle in screen-space coordinates matches the world-space
      // rectangle exactly because the main camera has no scroll offset.
      this.scrollCam = this.cameras.add(viewportX, viewportY, viewportW, this.viewportH)
      this.scrollCam.setScroll(this.scrollOriginX, this.contentWorldY)
      this.scrollCam.setBackgroundColor('rgba(0,0,0,0)')

      // Main camera shows everything EXCEPT the scrollable content objects
      this.cameras.main.ignore(this.contentObjects)

      // Scroll camera shows ONLY the content objects — ignore everything else
      const nonContentObjects = this.children.list.filter(
        go => !this.contentObjects.includes(go),
      )
      this.scrollCam.ignore(nonContentObjects)

      // ── Scrollbar (only when content overflows) ───────────────────────────────
      if (this.maxScrollY > 0) {
        this.scrollbarVisible = true

        const trackX = panelLeft + PANEL_W - SCROLLBAR_RIGHT_PAD - SCROLLBAR_W / 2

        this.scrollTrackTopY = viewportY + SCROLLBAR_TRACK_PAD
        this.scrollTrackH    = this.viewportH - SCROLLBAR_TRACK_PAD * 2

        // Track background
        const track = this.add.rectangle(
          trackX,
          this.scrollTrackTopY + this.scrollTrackH / 2,
          SCROLLBAR_W,
          this.scrollTrackH,
          0x1e3a5a, 0.8,
        ).setDepth(4).setOrigin(0.5, 0.5)

        // Thumb
        this.thumbH = Math.max(
          SCROLLBAR_THUMB_MIN_H,
          (this.viewportH / this.contentH) * this.scrollTrackH,
        )
        this.scrollThumb = this.add.rectangle(
          trackX,
          this.scrollTrackTopY + this.thumbH / 2,
          SCROLLBAR_W + 2,
          this.thumbH,
          0x4fc3f7, 0.9,
        ).setDepth(5).setOrigin(0.5, 0.5)
        this.scrollThumb.setInteractive({ useHandCursor: true })

        // Scrollbar lives on the main camera only — exclude from scroll cam
        this.scrollCam.ignore([track, this.scrollThumb])

        // Thumb drag
        this.scrollThumb.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
          this.thumbDragging        = true
          this.thumbDragStartY      = ptr.y
          this.thumbDragStartScroll = this.scrollY
        })
      }

      // ── Input events ──────────────────────────────────────────────────────────
      this.input.on(
        'wheel',
        (_ptr: unknown, _objs: unknown, _dx: number, dy: number) => {
          this.applyScroll(dy * 0.8)
        },
      )

      this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
        if (!this.thumbDragging) return
        const delta       = ptr.y - this.thumbDragStartY
        const scrollDelta = (delta / (this.scrollTrackH - this.thumbH)) * this.maxScrollY
        this.setScroll(this.thumbDragStartScroll + scrollDelta)
      })

      this.input.on('pointerup', () => { this.thumbDragging = false })
    })
  }

  // ── Scroll helpers ────────────────────────────────────────────────────────────

  private applyScroll(delta: number) {
    this.setScroll(this.scrollY + delta)
  }

  private setScroll(value: number) {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScrollY)
    if (this.scrollCam) {
      this.scrollCam.setScroll(this.scrollOriginX, this.contentWorldY + this.scrollY)
    }
    this.updateThumb()
  }

  private updateThumb() {
    if (!this.scrollbarVisible || !this.scrollThumb) return
    const t      = this.maxScrollY > 0 ? this.scrollY / this.maxScrollY : 0
    const thumbY = this.scrollTrackTopY + t * (this.scrollTrackH - this.thumbH) + this.thumbH / 2
    this.scrollThumb.setY(thumbY)
  }

  // ── Close ─────────────────────────────────────────────────────────────────────

  private close() {
    this.scene.stop('RulesScene')
  }
}
