// Most multiplayer/game logic happens here
// TODO: One day when we can upgrade or override DCL's typescript config
// without breaking things, these ts-ignore comments will be cleaned up

/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { getPlayerData } from '@decentraland/Players'
import { getUserPublicKey } from '@decentraland/Identity'
import { KeepRotatingComponent } from '@dcl/ecs-scene-utils'
import { ButtonStyles, CornerLabel, CustomPrompt, displayAnnouncement, FillInPrompt, OkPrompt, PromptStyles } from '@dcl/ui-scene-utils'

import config from './config'
import EventEmitter from './events'
import { recordUser, recordMove, cancelEntry, reportBug } from './backend'
import { padZero, showChessImg } from '../globalfunctions'
import { Leaderboard, updateBoard } from './leaderboard'
import { leaderboardScale } from './leaderboard'
import { FeeProvider } from './fees'
import { Floor } from './floor-manager'
import { createCancelButton } from './user-interface'

export enum PieceType {
  Pawn = 'P',
  Knight = 'N',
  Bishop = 'B',
  Rook = 'R',
  Queen = 'Q',
  King = 'K'
}

export interface Piece {
  owner: string
  location: string
  type: PieceType
  entity: Entity
  billboardEntity: Entity
  wallEntity: Entity
  placed?: boolean
  captured?: boolean
  promoted?: boolean
  listener?: any
  origin: {
    x: number
    z: number
    pieceScale: number
    location: string
    type: PieceType
  }
}

// TODO: Sort these properties or group them
export class GameplaySystem implements ISystem {
  id?: number
  me?: string
  floor: Floor
  state: string | undefined
  events: EventEmitter
  players: Array<string>
  leaderboard?: Leaderboard
  leaderboardData?: any[]
  gameParentEntity: Entity
  errorCount: number
  timeoutsLabel: CornerLabel
  moveLabel: CornerLabel
  checkLabel: CornerLabel
  turnLabel: CornerLabel
  timeLabel: CornerLabel
  timeouts: { [player: string]: number }
  hideAvatarArea: Entity
  hideAvatarsModifier: AvatarModifierArea
  cancelEntryButton: UIImage
  reportBugButton: Entity
  wallClock: Entity
  wallWhiteLabel: Entity
  wallBlackLabel: Entity
  wallCheckLabel: Entity
  gameInProgressEntity: Entity
  whiteNameEntity: Entity
  blackNameEntity: Entity
  floorBoardEntity?: Entity
  wallBoardEntity?: Entity
  board: { [position: string]: { rank: number; file: string; x: number; z: number; board: string, piece?: Piece } }
  wallBoard: { [position: string]: { rank: number; file: string; x: number; z: number; board: string } }
  game: any
  uiCanvas: UICanvas
  fen?: string
  round?: number
  lastMove: any
  pieces: Array<Piece>
  capturedPieces: Array<Piece>
  activePiece?: Piece
  activeTiles: Array<{ location: string; entity: Entity }>
  activeWallTiles: Array<{ location: string; entity: Entity }>
  activePlayer: string
  moves?: Array<object>
  capturedBlackPieces: Entity
  capturedWhitePieces: Entity
  capturedPieceImgPosX?: any
  capturedPieceImgPosY?: any
  capturedPieceImgPosZ?: any
  capturedPieceImgPosXadj?: number
  capturedPawnImgPosY?: number
  capturedPieceImgPosZadj?: number
  capturedPieceImgScale?: number
  capturedTileImgScale?: number
  capturedTileImgOffset?: number
  capturedPieceEntities: { [owner: string]: any[] }
  waitingForNextGame: boolean = false
  hasMoved: boolean = false
  feeProvider: FeeProvider = new FeeProvider()
  bannerText?: UIText
  splash: UIImage
  splashBlackTexture: Texture
  splashWhiteTexture: Texture
  splashText?: UIText
  shapes: {
    [owner: string]: {
      king?: GLTFShape,
      queen?: GLTFShape,
      bishop?: GLTFShape,
      knight?: GLTFShape,
      rook?: GLTFShape,
      pawn?: GLTFShape
    }
  }

  constructor(floor: Floor) {
    this.floor = floor

    this.board = {}
    this.wallBoard = {}
    this.pieces = []
    this.players = []
    this.capturedPieces = []
    this.capturedPieceImgPosX = 0
    this.capturedPieceImgPosY = 0
    this.capturedPieceImgPosZ = 0
    this.capturedPieceImgPosXadj = 1
    this.capturedPawnImgPosY = this.capturedPieceImgPosY - 2
    this.capturedPieceImgPosZadj = 1
    this.capturedPieceImgScale = 1.5
    this.capturedTileImgScale = 1.5
    this.capturedTileImgOffset = 0.01
    this.errorCount = 0
    this.timeouts = { black: 0, white: 0 }
    this.uiCanvas = new UICanvas()
    this.events = new EventEmitter()
    this.gameParentEntity = new Entity()
    engine.addEntity(this.gameParentEntity)

    getUserPublicKey().then(address => { this.me = address ? address : undefined }).catch(log)

    void this.feeProvider.init()

    this.hideAvatarsModifier = new AvatarModifierArea({
      area: { box: new Vector3(26, 80, 24) },
      modifiers: [AvatarModifiers.HIDE_AVATARS]
    })

    this.hideAvatarArea = new Entity()
    this.hideAvatarArea.addComponent(this.hideAvatarsModifier)
    this.hideAvatarArea.addComponent(new Transform({
      position: new Vector3(config.scene.xBase + 17, config.scene.yBase ?? 0, config.scene.zBase - 2)
    }))

    // --- For positioning the hideAvatarArea ---
    // const borderEntity = new Entity()
    // const borderShape = new BoxShape()
    // const borderMaterial = new Material()
    // borderShape.withCollisions = false
    // borderMaterial.albedoColor = Color3.Green()
    // borderEntity.setParent(this.hideAvatarArea)

    // borderEntity.addComponent(borderShape)
    // borderEntity.addComponent(borderMaterial)
    // borderEntity.addComponent(new Transform({
    //   position: new Vector3(0, (config.scene.yBase ?? 0) + 20, 0),
    //   scale: new Vector3(26, 80, 24)
    // }))
    // ------------------------------------------

    engine.addEntity(this.hideAvatarArea)

    this.splashBlackTexture = new Texture('images/chess-game/splash/MTVRS_YouWin-BlackWin_1222.png')
    this.splashWhiteTexture = new Texture('images/chess-game/splash/MTVRS_YouWin-WhiteWin_1222.png')
    this.splash = new UIImage(this.uiCanvas, this.splashBlackTexture)
    this.splash.sourceWidth = 1800
    this.splash.sourceHeight = 1080
    this.splash.width = 794
    this.splash.height = 461
    this.splash.hAlign = 'middle'
    this.splash.vAlign = 'center'
    this.splash.visible = false
    this.splash.isPointerBlocker = true
    this.splash.onClick = new OnPointerDown(() => {
      this.splash.isPointerBlocker = false
      this.splash.visible = false
    })
    // this.splashText = new UIText(this.uiCanvas)

    this.gameInProgressEntity = new Entity()
    this.gameInProgressEntity.setParent(this.gameParentEntity)
    this.gameInProgressEntity.addComponent(new TextShape('Game in progress'))
    this.gameInProgressEntity.addComponent(
      new Transform({
        position: new Vector3(config.scene.xBase + 30.25, this.floor.y + 0.8 + (this.floor.id > 0 ? config.scene.yBase : 0), config.scene.zBase - 1.1),
        rotation: Quaternion.Euler(0, 90, 0),
        scale: Vector3.Zero()
      })
    )

    // Cancel entry button
    // ------------------------------------------------------------------
    this.cancelEntryButton = createCancelButton()
    this.cancelEntryButton.onClick = new OnPointerDown(async () => {
      new OkPrompt(
        'Are you sure you want to leave this game?',
        async () => {
          this.removeBanner()
          if (!this.id) return

          try {
            this.cancelEntryButton.visible = false
            new (displayAnnouncement as any)('Cancelling your entry...', 2)
            const result = await cancelEntry(this.id, this.floor.id)
            log('cancelEntry:result', result)
            if (!result || result.error) throw new Error(result?.error || 'Network error')

            this.events.emit('chess:player:unregistered')
            this.leaderboard!.playNowPaid.getComponent(PlaneShape).visible = true
            this.leaderboard!.playNowPaidText.getComponent(TextShape).visible = true
            this.leaderboard!.playNowFree.getComponent(PlaneShape).visible = true
            this.leaderboard!.playNowFreeText.getComponent(TextShape).visible = true
          } catch (err: any) {
            log(err.message)
            new OkPrompt(
              this.game.type === 'free'
              ? 'There was an error cancelling your entry. Please try again.'
              : 'There was an error refunding your entry. Please contact support.'
            )

            this.cancelEntryButton.visible = true
          }
        }
      )
    }, {
      hoverText: 'Cancel Entry'
    })
    // ------------------------------------------------------------------

    // Report bug button
    this.reportBugButton = new Entity()
    this.reportBugButton.setParent(this.gameParentEntity)
    this.reportBugButton.addComponent(new PlaneShape())
    const reportBugButtonTexture = new Texture('images/chess-game/bug.png')
    const reportBugMaterial = new Material()
    reportBugMaterial.metallic = 0
    reportBugMaterial.roughness = 1
    reportBugMaterial.albedoTexture = reportBugButtonTexture
    this.reportBugButton.addComponent(reportBugMaterial)

    this.reportBugButton.addComponent(
      new Transform({
        position: new Vector3(34.34, this.floor.y + 0.9, 30.1),
        rotation: Quaternion.Euler(180, 0, 0),
        scale: Vector3.Zero()
      })
    )

    this.reportBugButton.addComponent(reportBugButtonTexture)

    this.reportBugButton.addComponent(new OnPointerDown(async () => {
      if (!this.id) return
      new FillInPrompt(
        'Bug Description',
        async (description: string) => {
          const data = { id: this.id, timestamp: Date.now(), game: this.game, description }
          const result = await reportBug(data)
          if (result.error) {
            log(result.error)
            new OkPrompt('There was an error reporting the bug. Please contact support.')
          }
        },
        'Report Bug',
        ' '
      )
    }, {
      hoverText: 'Report Bug'
    }))
    // ------------------------------------------------------------------

    this.capturedPieceEntities = { white: [], black: [] }
    this.shapes = { white: {}, black: {} }

    this.moveLabel = new CornerLabel('', -20, 85, Color4.White())
    this.moveLabel.hide()
    this.moveLabel.uiText.hTextAlign = 'right'

    this.timeoutsLabel = new CornerLabel('Timeouts WX/Y BX/Y', -20, 55, Color4.White(), 10)
    this.timeoutsLabel.hide()
    this.timeoutsLabel.uiText.hTextAlign = 'right'

    this.turnLabel = new CornerLabel('', -20, 25, Color4.White())
    this.turnLabel.hide()
    this.turnLabel.uiText.hTextAlign = 'right'

    this.timeLabel = new CornerLabel('00:00', -20, -5, Color4.White())
    this.timeLabel.hide()
    this.timeLabel.uiText.hTextAlign = 'right'

    this.checkLabel = new CornerLabel('Check!', -20, -35, Color4.Red())
    this.checkLabel.hide()
    this.checkLabel.uiText.hTextAlign = 'right'

    this.wallClock = new Entity()
    const clockText = new TextShape('')
    clockText.fontSize = this.floor.id > 0 ? 7 : 15
    clockText.color = Color3.White()
    this.wallClock.setParent(this.gameParentEntity)
    this.wallClock.addComponent(clockText)
    this.wallClock.addComponent(
      new Transform({
        position: new Vector3(config.scene.xBase + 30.25, this.floor.y + 10.5 - (this.floor.id > 0 ? -config.scene.yBase + 2.25 : 0), config.scene.zBase + 7),
        rotation: Quaternion.Euler(0, 90, 0),
        scale: Vector3.One()
      })
    )

    this.wallWhiteLabel = new Entity()
    const whiteText = new TextShape('')
    whiteText.fontSize = this.floor.id > 0 ? 8 : 10
    whiteText.color = Color3.White()
    this.wallWhiteLabel.setParent(this.gameParentEntity)
    this.wallWhiteLabel.addComponent(whiteText)
    this.wallWhiteLabel.addComponent(
      new Transform({
        position: new Vector3(config.scene.xBase + 30.25, this.floor.y + 9 + (this.floor.id > 0 ? config.scene.yBase - 2 : 0), config.scene.zBase + 7),
        rotation: Quaternion.Euler(0, 90, 0),
        scale: new Vector3(0.5, 0.5, 0.5)
      })
    )

    this.whiteNameEntity = new Entity()
    const whiteNameText = new TextShape('')
    whiteNameText.fontSize = this.floor.id > 0 ? 8 : 10
    whiteNameText.color = Color3.White()
    this.whiteNameEntity.setParent(this.gameParentEntity)
    this.whiteNameEntity.addComponent(whiteNameText)
    this.whiteNameEntity.addComponent(
      new Transform({
        position: new Vector3(config.scene.xBase + 30.25, this.floor.y + 8.2 + (this.floor.id > 0 ? config.scene.yBase - 2 : 0), config.scene.zBase + 7),
        rotation: Quaternion.Euler(0, 90, 0),
        scale: new Vector3(0.5, 0.5, 0.5)
      })
    )

    this.wallBlackLabel = new Entity()
    const blackText = new TextShape('')
    blackText.fontSize = this.floor.id > 0 ? 8 : 10
    blackText.color = Color3.White()
    this.wallBlackLabel.setParent(this.gameParentEntity)
    this.wallBlackLabel.addComponent(blackText)
    this.wallBlackLabel.addComponent(
      new Transform({
        position: new Vector3(config.scene.xBase + 30.25, this.floor.y + 9 + (this.floor.id > 0 ? config.scene.yBase - 2 : 0), config.scene.zBase - 9),
        rotation: Quaternion.Euler(0, 90, 0),
        scale: new Vector3(0.5, 0.5, 0.5)
      })
    )

    this.blackNameEntity = new Entity()
    const blackNameText = new TextShape('')
    blackNameText.fontSize = this.floor.id > 0 ? 8 : 10
    blackNameText.color = Color3.White()
    this.blackNameEntity.setParent(this.gameParentEntity)
    this.blackNameEntity.addComponent(blackNameText)
    this.blackNameEntity.addComponent(
      new Transform({
        position: new Vector3(config.scene.xBase + 30.25, this.floor.y + 8.2 + (this.floor.id > 0 ? config.scene.yBase - 2 : 0), config.scene.zBase - 9),
        rotation: Quaternion.Euler(0, 90, 0),
        scale: new Vector3(0.5, 0.5, 0.5)
      })
    )

    this.wallCheckLabel = new Entity()
    const checkText = new TextShape()
    checkText.value = 'Check!'
    checkText.fontSize = 7
    checkText.color = Color3.Red()
    this.wallCheckLabel.setParent(this.gameParentEntity)
    this.wallCheckLabel.addComponent(checkText)
    this.wallCheckLabel.addComponent(
      new Transform({
        position: new Vector3(config.scene.xBase + 30.25, this.floor.y + 11.8 + (this.floor.id > 0 ? config.scene.yBase - 11 : 0), config.scene.zBase + 7),
        rotation: Quaternion.Euler(0, 90, 0),
        scale: Vector3.Zero()
      })
    )

    //captured pieces parents
    this.capturedBlackPieces = new Entity()
    this.capturedBlackPieces.addComponent(
      new Transform({
        position: new Vector3(config.scene.xBase + 30.25, this.floor.y + 7 + (this.floor.id > 0 ? config.scene.yBase - 2 : 0), config.scene.zBase + 10.5),
        rotation: Quaternion.Euler(0, 90, 0),
        scale: Vector3.One()
      })
    )
    this.capturedBlackPieces.setParent(this.gameParentEntity)

    this.capturedWhitePieces = new Entity()
    this.capturedWhitePieces.addComponent(
      new Transform({
        position: new Vector3(config.scene.xBase + 30.25, this.floor.y + 7 + (this.floor.id > 0 ? config.scene.yBase - 2 : 0), config.scene.zBase - 5.4),
        rotation: Quaternion.Euler(0, 90, 0),
        scale: Vector3.One()
      })
    )
    this.capturedWhitePieces.setParent(this.gameParentEntity)

    // TODO: Move captured piece init to a separate function or module
    //black captured pieces 
    this.initializeCapturedPiece('black', PieceType.King, showChessImg(
      '',
      'King',
      'images/chess-game/black_set/king.PNG',
      640,
      751,
      this.capturedPieceImgScale,
      '',
      this.capturedPieceImgPosX,
      this.capturedPieceImgPosY,
      this.capturedPieceImgPosZ,
      0,
      0,
      180,
      false,
      "blackKing",
      this.capturedBlackPieces
    ))

    this.capturedPieceImgPosX += this.capturedPieceImgPosXadj * 1.25
    this.initializeCapturedPiece('black', PieceType.Queen, showChessImg(
      '',
      'Queen',
      'images/chess-game/black_set/queen.PNG',
      632,
      747,
      this.capturedPieceImgScale,
      '',
      this.capturedPieceImgPosX,
      this.capturedPieceImgPosY,
      this.capturedPieceImgPosZ,
      0,
      0,
      180,
      false,
      "blackQueen",
      this.capturedBlackPieces
    ))

    this.capturedPieceImgPosX += this.capturedPieceImgPosXadj

    for (let x = 1; x <= 2; x++) {
      this.initializeCapturedPiece('black', PieceType.Rook, showChessImg(
        '',
        'Rook',
        'images/chess-game/black_set/rook.PNG',
        529,
        748,
        this.capturedPieceImgScale,
        '',
        this.capturedPieceImgPosX,
        this.capturedPieceImgPosY,
        this.capturedPieceImgPosZ,
        0,
        0,
        180,
        false,
        "blackRook" + x,
        this.capturedBlackPieces
      ))
      this.capturedPieceImgPosX += this.capturedPieceImgPosXadj
    }

    for (let x = 1; x <= 2; x++) {
      this.initializeCapturedPiece('black', PieceType.Bishop, showChessImg(
        '',
        'Bishop',
        'images/chess-game/black_set/bishop.PNG',
        631,
        753,
        this.capturedPieceImgScale,
        '',
        this.capturedPieceImgPosX,
        this.capturedPieceImgPosY,
        this.capturedPieceImgPosZ,
        0,
        0,
        180,
        false,
        "blackBishop" + x,
        this.capturedBlackPieces
      ))
      this.capturedPieceImgPosX += this.capturedPieceImgPosXadj
    }

    for (let x = 1; x <= 2; x++) {
      this.initializeCapturedPiece('black', PieceType.Knight, showChessImg(
        '',
        'Knight',
        'images/chess-game/black_set/knight.PNG',
        458,
        749,
        this.capturedPieceImgScale,
        '',
        this.capturedPieceImgPosX,
        this.capturedPieceImgPosY,
        this.capturedPieceImgPosZ,
        0,
        0,
        180,
        false,
        "blackKnight" + x,
        this.capturedBlackPieces
      ))
      this.capturedPieceImgPosX += this.capturedPieceImgPosXadj
    }

    this.capturedPieceImgPosX = 0

    for (let x = 1; x <= 8; x++) {
      this.initializeCapturedPiece('black', PieceType.Pawn, showChessImg(
        '',
        'Pawn',
        'images/chess-game/black_set/pawn.PNG',
        222,
        516,
        this.capturedPieceImgScale,
        '',
        this.capturedPieceImgPosX,
        this.capturedPawnImgPosY || 0,
        this.capturedPieceImgPosZ,
        0,
        0,
        180,
        false,
        "blackPawn" + x,
        this.capturedBlackPieces
      ))
      this.capturedPieceImgPosX += this.capturedPieceImgPosXadj
    }

    this.capturedPieceImgPosX = 0
    this.capturedPieceImgPosZ = 0
    this.capturedPieceImgPosXadj = 1
    this.capturedPieceImgPosZadj = 1

    //white captured pieces

    this.initializeCapturedPiece('white', PieceType.King, showChessImg(
      '',
      'King',
      'images/chess-game/white_set/king_resized2.png',
      640,
      751,
      this.capturedPieceImgScale,
      '',
      this.capturedPieceImgPosX,
      this.capturedPieceImgPosY,
      this.capturedPieceImgPosZ,
      0,
      0,
      180,
      false,
      "whiteKing",
      this.capturedWhitePieces
    ))

    this.capturedPieceImgPosX += this.capturedPieceImgPosXadj

    this.initializeCapturedPiece('white', PieceType.Queen, showChessImg(
      '',
      'Queen',
      'images/chess-game/white_set/queen_resized2.png',
      632,
      747,
      this.capturedPieceImgScale,
      '',
      this.capturedPieceImgPosX,
      this.capturedPieceImgPosY,
      this.capturedPieceImgPosZ,
      0,
      0,
      180,
      false,
      "whiteQueen",
      this.capturedWhitePieces
    ))
    this.capturedPieceImgPosX += this.capturedPieceImgPosXadj

    for (let x = 1; x <= 2; x++) {
      this.initializeCapturedPiece('white', PieceType.Rook, showChessImg(
        '',
        'Rook',
        'images/chess-game/white_set/rook_resized3.PNG',
        529,
        748,
        this.capturedPieceImgScale,
        '',
        this.capturedPieceImgPosX,
        this.capturedPieceImgPosY,
        this.capturedPieceImgPosZ,
        0,
        0,
        180,
        false,
        "whiteRook" + x,
        this.capturedWhitePieces
      ))
      this.capturedPieceImgPosX += this.capturedPieceImgPosXadj
    }

    for (let x = 1; x <= 2; x++) {
      this.initializeCapturedPiece('white', PieceType.Bishop, showChessImg(
        '',
        'Bishop',
        'images/chess-game/white_set/bishop_resized2.PNG',
        631,
        753,
        this.capturedPieceImgScale,
        '',
        this.capturedPieceImgPosX,
        this.capturedPieceImgPosY,
        this.capturedPieceImgPosZ,
        0,
        0,
        180,
        false,
        "whiteBishop" + x,
        this.capturedWhitePieces
      ))
      this.capturedPieceImgPosX += this.capturedPieceImgPosXadj
    }

    for (let x = 1; x <= 2; x++) {
      this.initializeCapturedPiece('white', PieceType.Knight, showChessImg(
        '',
        'Knight',
        'images/chess-game/white_set/knight_resized2.PNG',
        458,
        749,
        this.capturedPieceImgScale,
        '',
        this.capturedPieceImgPosX,
        this.capturedPieceImgPosY,
        this.capturedPieceImgPosZ,
        0,
        0,
        180,
        false,
        "whiteKnight" + x,
        this.capturedWhitePieces
      ))
      this.capturedPieceImgPosX += this.capturedPieceImgPosXadj
    }


    this.capturedPieceImgPosX = 0

    for (let x = 1; x <= 8; x++) {
      this.initializeCapturedPiece('white', PieceType.Pawn, showChessImg(
        '',
        'Pawn',
        'images/chess-game/white_set/pawn_resized2.PNG',
        222,
        516,
        this.capturedPieceImgScale,
        '',
        this.capturedPieceImgPosX,
        this.capturedPawnImgPosY || 0,
        this.capturedPieceImgPosZ,
        0,
        0,
        180,
        false,
        "whitePawn" + x,
        this.capturedWhitePieces
      ))
      this.capturedPieceImgPosX += this.capturedPieceImgPosXadj
    }

    this.activePlayer = 'white'
    this.activeTiles = []
    this.activeWallTiles = []

    this.events.on('chess:game:started', ({ floor }) => {
      if (floor.id !== this.floor.id) return
      // @ts-ignore
      if (this.players.includes(this.me)) new (displayAnnouncement as any)(`Game ${this.id} started!`, 5)
    })

    this.events.on('chess:game:finished', () => {
      // @ts-ignore
      if (this.players.includes(this.me)) {
        const winner = this.game.isDraw ? null : (this.game.turn === 'white' ? this.game.black : this.game.white)
        // log({ winner })
        this.splash.source = winner === this.game.white ? this.splashWhiteTexture : this.splashBlackTexture
        // this.splash.visible = true
        this.splash.visible = false
        this.splash.isPointerBlocker = true
        // this.splashText.value = winner
        // this.splashText.hTextAlign = 'center'
        // this.splashText.vTextAlign = 'center'
        // this.splashText.fontSize = 50
        // this.splashText.color = Color4.Yellow()

      }
    })
  }

  initializeCapturedPiece(owner: string, type: PieceType, { myEntity, fullScale }: { myEntity: Entity, fullScale: any }) {
    this.capturedPieceEntities[owner].push({ owner, type, myEntity, fullScale, captured: false })
    myEntity.getComponent(Transform).scale = Vector3.Zero()
  }

  setCapturedPiece(piece: Piece) {
    if (!piece) return false

    let capturedPiece = this.capturedPieceEntities[piece.owner]
      // @ts-ignore
      .find((p: any) => p.type === piece.type && !p.captured)

    if (!capturedPiece) {
      // This must be a promoted pawn
      capturedPiece = this.capturedPieceEntities[piece.owner]
        // @ts-ignore
        .find((p: any) => p.type === PieceType.Pawn && !p.captured)
    }

    // log(capturedPiece?.type, capturedPiece?.fullScale)
    capturedPiece.fullScale()
    capturedPiece.captured = true
    return true
  }

  update() {
    // log(this.game)
  }

  async syncState(id: number, game: any) { // TODO: Define game type
    this.id = id
    this.game = game

    if (!this.id) return
    const newState = this.game.state || 'Unknown'

    this.activePlayer = this.game.turn
    this.players = this.game.entries ? Object.keys(this.game.entries) : []
    this.moves = this.game.moves
    this.round = this.game.pgn.match(/\d+\./g)?.map((r: string) => parseInt(r.replace('.', ''))).slice(-1)

    if (config.game.logState) {
      if (!config.game.differentialLogState) {
        log('\n' + this.game.ascii)
        log(this.game)
      } else {
        if (this.fen !== this.game.fen) {
          log('\n' + this.game.ascii)
          log(this.game)
        }
      }
    }

    this.fen = this.game.fen
    if (this.leaderboard && this.leaderboardData) void updateBoard(this.leaderboardData as any, this.leaderboard.boardParent)

    if (this.state !== newState) {
      switch (newState) {
        case 'Registration':
          this.events.emit('chess:game:registration', this.game)
          this.resetBoard()
          this.showLeaderboard()
          this.waitingForNextGame = false
          break
        case 'Started':
          this.events.emit('chess:game:started', { game: this.game, floor: this.floor })
          this.removeBanner()
          break
      }

      this.leaderboard!.playNowPaid.getComponent(PlaneShape).visible = true
      this.leaderboard!.playNowPaidText.getComponent(TextShape).visible = true
      this.leaderboard!.playNowFree.getComponent(PlaneShape).visible = true
      this.leaderboard!.playNowFreeText.getComponent(TextShape).visible = true
    }

    this.state = newState

    // if (this.game?.notification) log(this.game.notification)
    // if (this.game?.notification) new (displayAnnouncement as any)(this.game.notification, 5)

    if (this.leaderboard) {
      if (this.state === 'Registration') {
        // @ts-ignore
        if (this.players.includes(this.me) && !this.game.type) {
          this.leaderboard.playNowPaid.getComponent(PlaneShape).visible = false
          this.leaderboard.playNowPaidText.getComponent(TextShape).visible = false
          this.leaderboard.playNowFree.getComponent(PlaneShape).visible = false
          this.leaderboard.playNowFreeText.getComponent(TextShape).visible = false
        } else {
          this.leaderboard.playNowPaid.getComponent(PlaneShape).visible = true
          this.leaderboard.playNowPaidText.getComponent(TextShape).visible = true
          this.leaderboard.playNowFree.getComponent(PlaneShape).visible = true
          this.leaderboard.playNowFreeText.getComponent(TextShape).visible = true
        }

        // @ts-ignore
        if (this.players.length === 1 && this.players.includes(this.me)) {
          this.cancelEntryButton.visible = true

          if (!this.bannerText) {
            this.bannerText = new UIText(this.uiCanvas)
            this.bannerText.value = 'Waiting for opponent...'
            this.bannerText.hTextAlign = 'center'
            this.bannerText.vTextAlign = 'center'
            this.bannerText.fontSize = 50
            this.bannerText.color = Color4.Yellow()
          }
        } else {
          this.removeBanner()
          this.cancelEntryButton.visible = false
        }

        if (this.game.type) {
          if (this.game.type === 'free') {
            this.leaderboard.playNowPaid.getComponent(PlaneShape).visible = false
            this.leaderboard.playNowPaidText.getComponent(TextShape).visible = false
          } else {
            this.leaderboard.playNowFree.getComponent(PlaneShape).visible = false
            this.leaderboard.playNowFreeText.getComponent(TextShape).visible = false
          }
        }
      } else {
        this.leaderboard.playNowPaid.getComponent(PlaneShape).visible = false
        this.leaderboard.playNowPaidText.getComponent(TextShape).visible = false
        this.leaderboard.playNowFree.getComponent(PlaneShape).visible = false
        this.leaderboard.playNowFreeText.getComponent(TextShape).visible = false
      }
    }

    if (this.state !== 'Registration') {
      this.gameInProgressEntity.getComponent(Transform).scale = new Vector3(0.5, 0.5, 0.5)
      this.gameInProgressEntity.getComponent(TextShape).value = `Game ${this.id} in progress`
    } else {
      this.gameInProgressEntity.getComponent(Transform).scale = Vector3.Zero()
    }

    if (this.state === 'Started') {
      this.cancelEntryButton.visible = false
      if (config.game.enableBugReports) this.reportBugButton.getComponent(Transform).scale = Vector3.One()

      let turnText = 'THEIR'
      if (this.game[this.game.turn] === this.me) turnText = 'YOUR'

      if (!this.waitingForNextGame) this.turnLabel.set(`${turnText} TURN`)
      else this.turnLabel.hide()

      if (this.game[this.game.turn] !== this.me) this.turnLabel.uiText.color = Color4.Gray()
      else this.turnLabel.uiText.color = Color4.White()

      if (this.game[this.game.turn] !== this.me) this.hasMoved = false

      // @ts-ignore
      if (!this.players.includes(this.me)) this.turnLabel.hide()
      else this.turnLabel.show()

      for (const piece of this.pieces) {
        if (
          this.game[this.game.turn] === this.me
          && this.game[piece.owner] === this.me
          && !this.hasMoved
        ) {
          piece.listener.showFeedback = true
          piece.listener.hoverText = 'Move Piece'
        } else {
          piece.listener.showFeedback = false
        }
      }

      // Replaced in favor of you/them white/black labels, but may be useful for showing other information in the future
      // ---------------------------------------------------------------------
      // this.wallTurnLabel.getComponent(TextShape).value = `${this.game.turn.toUpperCase()}'S TURN`
      // this.wallTurnLabel.getComponent(Transform).scale = Vector3.One()

      // @ts-ignore
      // if (this.players.includes(this.me)) {
      //   if (this.game[this.game.turn] !== this.me) this.wallTurnLabel.getComponent(TextShape).color = Color3.Gray()
      //   else this.wallTurnLabel.getComponent(TextShape).color = Color3.White()
      // } else {
      //   this.wallTurnLabel.getComponent(TextShape).color = Color3.White()
      // }
      // ---------------------------------------------------------------------

      const whiteDisplay = `${this.game.white.substr(0, 6)}..${this.game.white.substr(-4)}`
      const blackDisplay = `${this.game.black.substr(0, 6)}..${this.game.black.substr(-4)}`

      const whiteData = await getPlayerData({ userId: this.game.white })
      const blackData = await getPlayerData({ userId: this.game.black })

      let wallWhiteDisplay = this.game.white === this.me ? 'YOU (White Team)' : 'THEM (White Team)'
      let wallBlackDisplay = this.game.black === this.me ? 'YOU (Black Team)' : 'THEM (Black Team)'

      // @ts-ignore
      if (!this.players.includes(this.me)) {
        wallWhiteDisplay = 'WHITE'
        wallBlackDisplay = 'BLACK'
      }

      const wallLabel = this.game.turn === 'white' ? this.wallWhiteLabel : this.wallBlackLabel
      const wallName = this.game.turn === 'white' ? this.whiteNameEntity : this.blackNameEntity

      this.whiteNameEntity.getComponent(TextShape).color = Color3.Gray()
      this.blackNameEntity.getComponent(TextShape).color = Color3.Gray()
      this.wallWhiteLabel.getComponent(TextShape).color = Color3.Gray()
      this.wallBlackLabel.getComponent(TextShape).color = Color3.Gray()
      wallLabel.getComponent(TextShape).color = Color3.White()
      wallName.getComponent(TextShape).color = Color3.White()

      this.wallWhiteLabel.getComponent(TextShape).value = wallWhiteDisplay
      this.wallBlackLabel.getComponent(TextShape).value = wallBlackDisplay

      this.whiteNameEntity.getComponent(TextShape).value = whiteData?.displayName || whiteDisplay
      this.blackNameEntity.getComponent(TextShape).value = blackData?.displayName || blackDisplay

      if (config.game.timeControl) {
        const meColor = this.me === this.game.white ? 'white' : 'black'
        const meTime = new Date(this.game.time[meColor].left)
        const meMinutes = padZero(meTime.getUTCMinutes())
        const meSeconds = padZero(meTime.getUTCSeconds())

        const themColor = this.me === this.game.black ? 'white' : 'black'
        const themTime = new Date(this.game.time[themColor].left)
        const themMinutes = padZero(themTime.getMinutes())
        const themSeconds = padZero(themTime.getSeconds())

        if (this.game.gameOver || this.game.time[meColor].left < 0 || this.game.time[themColor].left < 0) this.timeLabel.hide()
        else this.timeLabel.set(`${meMinutes}:${meSeconds} | ${themMinutes}:${themSeconds}`)
      }

      if (config.game.timedTurns) {
        const timer = this.game.turnLimit - this.game.turnLeft
        const meTime = new Date(timer)
        const meMinutes = padZero(meTime.getUTCMinutes())
        const meSeconds = padZero(meTime.getUTCSeconds())

        this.timeoutsLabel.set(`TIMEOUTS: W${this.timeouts.white}/${config.game.timedTurnsTimeoutLimit} B${this.timeouts.black}/${config.game.timedTurnsTimeoutLimit}`)
        if (this.game.time.white.timeouts || this.game.time.black.timeouts) {
          if (this.timeouts.white === 0 && !this.game.time.white.timeouts) this.game.time.white.timeouts = 0
          if (this.timeouts.black === 0 && !this.game.time.black.timeouts) this.game.time.black.timeouts = 0

          // @ts-ignore
          if (this.timeouts.white !== this.game.time.white.timeouts && this.players.includes(this.me)) {
            new (displayAnnouncement as any)(`${whiteData?.displayName || whiteDisplay} ran out of time! (${++this.timeouts.white}/${config.game.timedTurnsTimeoutLimit})`, 3)
            // this.timeoutsLabel.set(`TIMEOUTS: W${this.timeouts.white}/${config.game.timedTurnsTimeoutLimit} B${this.timeouts.black}/${config.game.timedTurnsTimeoutLimit}`)
            // this.timeoutsLabel.show()
          }

          // @ts-ignore
          if (this.timeouts.black !== this.game.time.black.timeouts && this.players.includes(this.me)) {
            new (displayAnnouncement as any)(`${blackData?.displayName || blackDisplay} ran out of time! (${++this.timeouts.black}/${config.game.timedTurnsTimeoutLimit})`, 3)
            // this.timeoutsLabel.set(`TIMEOUTS: W${this.timeouts.white}/${config.game.timedTurnsTimeoutLimit} B${this.timeouts.black}/${config.game.timedTurnsTimeoutLimit}`)
            // this.timeoutsLabel.show()
          }

          if (this.timeouts.white !== this.game.time.white.timeouts || this.timeouts.black !== this.game.time.black.timeouts) {
            this.clearActiveTiles()

            if (this.activePiece) {
              if (this.activePiece.entity) {
                if (this.activePiece.entity.hasComponent(Transform)) this.activePiece.entity.getComponent(Transform).position.y = 0
                if (this.activePiece.entity.hasComponent(KeepRotatingComponent)) this.activePiece.entity.getComponent(KeepRotatingComponent).stop()
              }

              this.activePiece = undefined
            }
          }

          this.timeouts.white = this.game.time.white.timeouts || 0
          this.timeouts.black = this.game.time.black.timeouts || 0
        }

        // @ts-ignore
        if (this.players.includes(this.me)) {
          if (this.game.gameOver || timer < 0) this.timeLabel.hide()
          else this.timeLabel.set(`${meMinutes}:${meSeconds}`)
        } else {
          this.timeLabel.hide()
          this.turnLabel.hide()
          this.timeoutsLabel.hide()
        }

        if (this.game.gameOver || timer < 0) {
          this.wallClock.getComponent(Transform).scale = Vector3.Zero()
        } else {
          this.wallClock.getComponent(TextShape).value = `${meMinutes}:${meSeconds}`
          this.wallClock.getComponent(Transform).scale = Vector3.One()

          // @ts-ignore
          if (this.players.includes(this.me)) {
            if (this.game[this.game.turn] !== this.me) this.wallClock.getComponent(TextShape).color = Color3.Gray()
            else this.wallClock.getComponent(TextShape).color = Color3.White()
          } else {
            this.wallClock.getComponent(TextShape).color = Color3.White()
          }

          if (timer < 6000) this.wallClock.getComponent(TextShape).color = Color3.Red()
        }

        if (this.game.turn === 'white') this.wallClock.getComponent(Transform).position = new Vector3(config.scene.xBase + 30.25, this.floor.y + 10.5 - (this.floor.id > 0 ? -config.scene.yBase + 2.25 : 0), config.scene.zBase + 7)
        else this.wallClock.getComponent(Transform).position = new Vector3(config.scene.xBase + 30.25, this.floor.y + 10.5 - (this.floor.id > 0 ? -config.scene.yBase + 2.25 : 0), config.scene.zBase - 9)

        if (this.game[this.game.turn] !== this.me) {
          this.clearActiveTiles()

          if (this.activePiece) {
            this.activePiece.entity.getComponent(Transform).position.y = 0
            this.activePiece.entity.getComponent(KeepRotatingComponent).stop()
            this.activePiece = undefined
          }
        }

        // @ts-ignore
        if (this.players.includes(this.me)) {
          if (this.game[this.game.turn] !== this.me) this.timeLabel.uiText.color = Color4.Gray()
          else this.timeLabel.uiText.color = Color4.White()

          if (timer < 6000) this.timeLabel.uiText.color = Color4.Red()
        } else {
          this.timeLabel.uiText.visible = false
        }
      }

      if (this.game.gameOver && !this.waitingForNextGame) {
        if (this.floor.floorManager.inBuilding) {
          if (this.game.isCheckmate) {
            new (displayAnnouncement as any)(`${this.game.turn === 'white' ? blackDisplay : whiteDisplay} wins by checkmate!`, 10)
            this.timeoutsLabel.set('')
          }

          if (this.game.isDraw) {
            if (this.game.isStalemate) new (displayAnnouncement as any)('The game is a stalemate!', 10)
            else if (this.game.isInsufficientMaterial) new (displayAnnouncement as any)('The game is a draw due to insufficient material!', 10)
            else if (this.game.isThreefoldRepetition) new (displayAnnouncement as any)('The game is a draw due to threefold repetition!', 10)
            else new (displayAnnouncement as any)('The game is a draw!', 10)
          }

          if (this.game.isTimeUp) {
            new (displayAnnouncement as any)(`${this.game.turn === 'white' ? blackDisplay : whiteDisplay} wins by timeout!`, 10)
            this.timeoutsLabel.set(`TIMEOUTS: W${this.timeouts.white}/${config.game.timedTurnsTimeoutLimit} B${this.timeouts.black}/${config.game.timedTurnsTimeoutLimit}`)
          }

          if (this.game.isMaxMoves) new (displayAnnouncement as any)('Maximum moves reached, game is a draw', 10)
        }

        this.waitingForNextGame = true
        this.events.emit('chess:game:finished', this.game)
      }

      if (this.game.inCheck) {
        this.checkLabel.set('Check!')

        if (this.me !== this.game[this.game.turn]) {
          this.checkLabel.uiText.color = Color4.Green()
        } else {
          this.checkLabel.uiText.color = Color4.Red()
        }

        // @ts-ignore
        if (this.players.includes(this.me)) this.checkLabel.show()
        else this.checkLabel.hide()

        if (this.game.turn === 'white') this.wallCheckLabel.getComponent(Transform).position = new Vector3(config.scene.xBase + 30.25, this.floor.y + 11.8 + (this.floor.id > 0 ? config.scene.yBase - 11 : 0), config.scene.zBase + 7)
        else this.wallCheckLabel.getComponent(Transform).position = new Vector3(config.scene.xBase + 30.25, this.floor.y + 11.8 + (this.floor.id > 0 ? config.scene.yBase - 11 : 0), config.scene.zBase - 9)

        this.wallCheckLabel.getComponent(Transform).scale = Vector3.One()
      } else {
        this.checkLabel.hide()
        this.wallCheckLabel.getComponent(Transform).scale = Vector3.Zero()
      }
    }

    // @ts-ignore
    for (const [index, entry] of Object.entries(this.game.history || {})) {
      if (this.lastMove?.index && parseInt(index) <= this.lastMove.index) continue
      // @ts-ignore
      let fromPiece = this.pieces.find((p: Piece) => (
        p.location === entry.from
        && p.owner[0] === entry.color
        && p.type === entry.piece.toUpperCase()
      ))

      if (entry.promotion && fromPiece) await this.promotePawn(fromPiece, entry, entry.promotion)

      if (entry.captured && fromPiece) {
        // @ts-ignore
        const capturedPiece = this.pieces.find((p: Piece) => (
          p.location === entry.to
          && p.owner[0] !== entry.color
          && p.type === entry.captured.toUpperCase()
        ))

        if (capturedPiece) {
          capturedPiece.captured = true
          capturedPiece.location = ''
          engine.removeEntity(capturedPiece.entity)
          engine.removeEntity(capturedPiece.wallEntity)
          this.capturedPieces.push(capturedPiece)
          this.setCapturedPiece(capturedPiece)
        } else {
          fromPiece = undefined
        }
      }

      // Handle castling
      // k = kingside castling
      // q = queenside castling
      if (entry.flags === 'k' || entry.flags === 'q') {
        const rookFrom = entry.color === 'w'
          ? (entry.flags === 'k' ? 'h1' : 'a1')
          : (entry.flags === 'k' ? 'h8' : 'a8')

        const rookTo = entry.color === 'w'
          ? (entry.flags === 'k' ? 'f1' : 'd1')
          : (entry.flags === 'k' ? 'f8' : 'd8')

        // @ts-ignore
        const fromPiece = this.pieces.find((p: Piece) => (p.location === rookFrom))
        if (fromPiece) this.movePiece(rookFrom, rookTo)
      }

      if (fromPiece && fromPiece.location !== '') this.movePiece(fromPiece.location, entry.to)
      this.lastMove = { index: parseInt(index), entry }
      this.moveLabel.set(this.lastMove.entry.san)
      if (!config.game.showLastMoveSAN) this.moveLabel.hide()

      if (this.game[this.game.turn] === this.me && entry.color !== this.game.turn[0] && !this.activePiece) {
        this.highlightTile(entry.to, 'floor')
        this.highlightTile(entry.to, 'wall')
      }
    }
  }

  removeBanner() {
    if (!this.bannerText) return
    this.bannerText.value = ''
    this.bannerText = undefined
  }

  showLeaderboard() {
    if (!this.leaderboard || !this.wallBoardEntity) return
    this.leaderboard.boardParent.getComponent(Transform).scale = new Vector3(leaderboardScale, leaderboardScale, leaderboardScale)
    this.wallBoardEntity.getComponent(Transform).scale = Vector3.Zero()
  }

  hideLeaderboard() {
    if (!this.leaderboard || !this.wallBoardEntity) return
    this.leaderboard.boardParent.getComponent(Transform).scale = Vector3.Zero()
    this.wallBoardEntity.getComponent(Transform).scale = this.floor.id === 0 ? Vector3.One() : new Vector3(0.85, 0.85, 0.85)
  }

  resetBoard() {
    this.hasMoved = false
    this.checkLabel.hide()
    this.turnLabel.hide()
    this.timeLabel.hide()
    this.capturedPieces = []
    this.timeouts = { black: 0, white: 0 }
    this.lastMove = undefined
    this.moveLabel.set('')
    this.timeoutsLabel.set('')
    if (!config.game.showLastMoveSAN) this.moveLabel.hide()
    this.wallClock.getComponent(Transform).scale = Vector3.Zero()
    this.wallCheckLabel.getComponent(Transform).scale = Vector3.Zero()
    this.reportBugButton.getComponent(Transform).scale = Vector3.Zero()
    this.wallWhiteLabel.getComponent(TextShape).value = ''
    this.wallBlackLabel.getComponent(TextShape).value = ''
    this.whiteNameEntity.getComponent(TextShape).value = ''
    this.blackNameEntity.getComponent(TextShape).value = ''

    if (this.activePiece) {
      if (this.activePiece.entity) {
        if (this.activePiece.entity.hasComponent(Transform)) this.activePiece.entity.getComponent(Transform).position.y = 0
        if (this.activePiece.entity.hasComponent(KeepRotatingComponent)) this.activePiece.entity.getComponent(KeepRotatingComponent).stop()
      }

      this.activePiece = undefined
    }

    this.clearActiveTiles()

    for (const piece of this.pieces) {
      const transform = piece.entity.getComponent(Transform)
      const wallTransform = piece.wallEntity.getComponent(Transform)
      const wallLocation = this.wallBoard[piece.origin.location]

      piece.billboardEntity.addComponentOrReplace(new TextShape(this.getPieceTypeName(piece.origin.type)))

      if (piece.type !== piece.origin.type) {
        const shape = this.shapes[piece.owner].pawn
        piece.entity.addComponentOrReplace(shape as GLTFShape)
        piece.entity.getComponent(Transform).scale = new Vector3(piece.origin.pieceScale, piece.origin.pieceScale, piece.origin.pieceScale)
      }

      transform.position.y = 0
      transform.position.x = piece.origin.x
      transform.position.z = piece.origin.z

      wallTransform.position.y = 0.01
      wallTransform.position.x = wallLocation.x
      wallTransform.position.z = wallLocation.z

      piece.type = piece.origin.type
      piece.location = piece.origin.location
      piece.captured = false
      piece.promoted = false

      piece.entity.addComponentOrReplace(this.generatePieceListener(piece))
      piece.listener.showFeedback = false

      engine.addEntity(piece.entity)
      engine.addEntity(piece.wallEntity)
    }

    for (const piece of this.capturedPieceEntities['white']) {
      piece.myEntity.getComponent(Transform).scale = Vector3.Zero()
      piece.captured = false
      engine.addEntity(piece.myEntity)
    }

    for (const piece of this.capturedPieceEntities['black']) {
      piece.myEntity.getComponent(Transform).scale = Vector3.Zero()
      piece.captured = false
      engine.addEntity(piece.myEntity)
    }

    for (const location of Object.keys(this.board)) this.board[location].piece = undefined
  }

  async addPlayer(address: string, tx?: string, metadata?: any) {
    if (this.state !== 'Registration') throw new Error('Not accepting new players')
    if (this.players.length === 2) throw new Error('Maximum players entered')
    // @ts-ignore
    if (this.players.includes(address.toLowerCase())) throw new Error('You are already registered')

    const user = await getPlayerData({ userId: address })
    const response = await recordUser({
      name: user?.displayName || address,
      address,
      floor: this.floor.id,
      gameId: this.id,
      metadata,
      tx
    })

    if (!response || response.error) throw new Error(response.error.toString())
    this.players.push(address.toLowerCase())
    this.events.emit('chess:player:registered', address.toLowerCase())
    return { error: false }
  }

  generatePieceListener(piece: Piece) {
    return new OnPointerDown(async () => {
      const user = await getUserPublicKey()
      const ownerAddress = piece.owner === 'white' ? this.game.white : this.game.black

      if (this.game[this.game.turn] !== this.me || this.hasMoved) return

      if (user === ownerAddress)
        void this.setActivePiece(piece.location, piece.entity)
      else {
        if (this.activePiece) {
          // @ts-ignore
          const move = this.moves?.find((move: any) => move.from === this.activePiece?.location && move.to === piece.location)

          if (move) {
            if (move.captured) {
              // @ts-ignore
              const capturedPiece = this.pieces.find((piece: Piece) => (
                piece.location === move.to
                && piece.type === move.captured.toUpperCase()
              ))

              if (capturedPiece) {
                capturedPiece.captured = true
                capturedPiece.location = ''
                engine.removeEntity(capturedPiece.entity)
                engine.removeEntity(capturedPiece.wallEntity)
                this.capturedPieces.push(capturedPiece)
                this.setCapturedPiece(capturedPiece)
              }
            }

            if (move.promotion) {
              const promotePrompt = new CustomPrompt(PromptStyles.DARK)
              promotePrompt.closeIcon.visible = false
              promotePrompt.addText('Pawn Promoted!', 10, 150, Color4.White(), 25)
              promotePrompt.addText('What would you like to promote it to?', 10, 100, Color4.White(), 15)
              promotePrompt.addButton('Queen', -100, -20, () => this.promotePawn(this.activePiece!, move, 'q', promotePrompt), ButtonStyles.ROUNDGOLD)
              promotePrompt.addButton('Rook', 100, -20, () => this.promotePawn(this.activePiece!, move, 'r', promotePrompt), ButtonStyles.ROUNDSILVER)
              promotePrompt.addButton('Bishop', -100, -80, () => this.promotePawn(this.activePiece!, move, 'b', promotePrompt), ButtonStyles.ROUNDBLACK)
              promotePrompt.addButton('Knight', 100, -80, () => this.promotePawn(this.activePiece!, move, 'n', promotePrompt), ButtonStyles.ROUNDWHITE)
            } else {
              await this.setActivePiece(move.from, this.activePiece.entity)
              this.hasMoved = true
              this.movePiece(move.from, move.to)
              try {
                const result = await recordMove({ id: this.id, floor: this.floor.id, move, autoOpponent: config.game.autoOpponent })
                if (!result || result.error) throw new Error('Invalid move')
              } catch (err) {
                log('error recording move')
                this.resetBoard()
              }
            }

            this.moveLabel.set(move.san)
            if (!config.game.showLastMoveSAN) this.moveLabel.hide()
          }
        }
      }
    }, {
      showFeedback: false
    })
  }

  addPiece(
    location: string,
    entity: Entity,
    billboardEntity: Entity,
    owner: string,
    type: PieceType,
    origin: { x: number, z: number, pieceScale: number, location: string }
  ) {
    const piece = { location, entity, billboardEntity, owner, type, origin } as Piece
    piece.origin.type = type

    const typeName = this.getPieceTypeName(piece.type)
    const typeImage = `images/chess-game/${owner === 'white' ? 'white_set' : 'black_set'}/top_down_icons/${typeName}.png`
    const wallLocation = this.wallBoard[piece.location]

    if (wallLocation) {
      const { myEntity } = showChessImg(
        '',
        '',
        typeImage,
        100,
        100,
        1,
        '',
        wallLocation.x,
        0.01,
        wallLocation.z,
        90,
        0,
        -90,
        false,
        `wall_${owner}_${type}`,
        this.wallBoardEntity!,
        {
          alpha: true,
          scaleOverride: { x: 0.65, y: 0.65, z: 0.65 }
        }
      )

      piece.wallEntity = myEntity
    }

    piece.listener = this.generatePieceListener(piece)
    entity.addComponentOrReplace(piece.listener)
    this.pieces.push(piece)
  }

  movePiece(from: string, to: string) {
    if (from === to) return

    // @ts-ignore
    const piece = this.pieces.find((piece: Piece) => piece.location === from) as Piece
    if (!piece) return
    const tile = this.board[to]
    const wallTile = this.wallBoard[to]
    const transform = piece.entity.getComponent(Transform)
    const wallTransform = piece.wallEntity.getComponent(Transform)

    // log(`Moving ${piece.type} from ${from} to ${to}`)
    piece.location = to
    transform.position.x = tile.x
    transform.position.z = tile.z
    wallTransform.position.x = wallTile.x
    wallTransform.position.z = wallTile.z
    this.board[from].piece = undefined
    this.board[to].piece = piece
  }

  clearActiveTiles() {
    for (const tile of this.activeTiles) engine.removeEntity(tile.entity)
    for (const tile of this.activeWallTiles) engine.removeEntity(tile.entity)
    this.activeTiles = []
    this.activeWallTiles = []
  }

  async setActivePiece(location: string, entity: Entity) {
    if (this.game.state !== 'Started' || this.hasMoved) return
    // @ts-ignore
    const piece = this.pieces.find((p: Piece) => p.location === location)
    if (!piece) return

    const user = await getUserPublicKey()
    const ownerAddress = piece.owner === 'white' ? this.game.white : this.game.black

    this.clearActiveTiles()

    if (this.activePiece) {
      if (user !== ownerAddress) { // probably a capture
        this.capturedPieces.push(piece)
        this.setCapturedPiece(piece)
        this.movePiece(this.activePiece?.location, piece.location)
        piece.captured = true
        piece.location = ''
        engine.removeEntity(piece.entity)
        engine.removeEntity(piece.wallEntity)
      }

      if (this.activePiece.entity) {
        if (this.activePiece.entity.hasComponent(Transform)) this.activePiece.entity.getComponent(Transform).position.y = 0
        if (this.activePiece.entity.hasComponent(KeepRotatingComponent)) this.activePiece.entity.getComponent(KeepRotatingComponent).stop()
      }

      if (this.lastMove) {
        this.highlightTile(this.lastMove.entry.to, 'floor')
        this.highlightTile(this.lastMove.entry.to, 'wall')
      }

      if (this.activePiece.location === location) return (this.activePiece = undefined)
    }

    entity.getComponent(Transform).position.y = 0.5
    entity.addComponentOrReplace(new KeepRotatingComponent(Quaternion.Euler(3, 180, 0)))

    this.activePiece = piece
    this.highlightTile(location)
    this.highlightTile(location, 'wall')

    const moves = this.moves?.filter((move: any) => move.from === location) || []

    moves.forEach((move: any) => {
      this.highlightTile(move.to)
      this.highlightTile(move.to, 'wall')
    })
  }

  getPieceTypeName(type: PieceType) {
    switch (type) {
      case PieceType.Queen: return 'Queen'
      case PieceType.King: return 'King'
      case PieceType.Bishop: return 'Bishop'
      case PieceType.Knight: return 'Knight'
      case PieceType.Rook: return 'Rook'
      case PieceType.Pawn: return 'Pawn'
    }
  }

  async promotePawn(piece: Piece, move: any, type: string, prompt?: CustomPrompt) {
    // @ts-ignore
    const promotionPieceSample = this.pieces.find((piece: Piece) => piece.type === type.toUpperCase())

    let newType: PieceType
    let shape
    switch (type) {
      case 'q':
        shape = this.shapes[piece.owner].queen
        newType = PieceType.Queen
        break
      case 'r':
        shape = this.shapes[piece.owner].rook
        newType = PieceType.Rook
        break
      case 'b':
        shape = this.shapes[piece.owner].bishop
        newType = PieceType.Bishop
        break
      case 'n':
        shape = this.shapes[piece.owner].knight
        newType = PieceType.Knight
        break
    }

    const typeImage = `images/chess-game/${piece.owner === 'white' ? 'white_set' : 'black_set'}/top_down_icons/${this.getPieceTypeName(newType!)}.png`
    const newTexture = new Texture(typeImage)
    const newMaterial = new Material()
    newMaterial.albedoTexture = newTexture
    newMaterial.alphaTexture = newTexture
    newMaterial.metallic = 0
    newMaterial.roughness = 1
    piece.wallEntity.addComponentOrReplace(newMaterial)

    piece.entity.addComponentOrReplace(shape as GLTFShape)
    piece.billboardEntity.addComponentOrReplace(new TextShape(`${this.getPieceTypeName(newType!)}+`))
    piece.entity.getComponent(Transform).scale = new Vector3(promotionPieceSample.origin.pieceScale, promotionPieceSample.origin.pieceScale, promotionPieceSample.origin.pieceScale)

    piece.type = newType!
    piece.promoted = true

    if (prompt) {
      prompt.hide()
      await this.setActivePiece(move.from, piece.entity)
      this.movePiece(move.from, move.to)
      this.hasMoved = true
      try {
        const result = await recordMove({ id: this.id, floor: this.floor.id, move, autoOpponent: config.game.autoOpponent })
        if (!result || result.error) throw new Error('Invalid move')
      } catch (err) {
        log('error recording move')
        this.resetBoard()
      }
    }
  }

  highlightTile(location: string, board = 'floor', highlightMaterial = 'images/chess-game/silver_white_100x100.png') {
    const { x, z } = (board === 'floor' ? this.board : this.wallBoard)[location]

    // log('Highlighting', { location, x, z })

    const { myEntity } = showChessImg(
      '',
      '',
      highlightMaterial,
      100,
      100,
      1,
      '',
      x,
      0.001,
      z,
      90,
      0,
      90,
      false,
      "pathTile",
      (board === 'floor' ? this.floorBoardEntity : this.wallBoardEntity) || new Entity()
    )

    if (board === 'floor') {
      myEntity.addComponentOrReplace(
        new OnPointerDown(async () => {
          if (!this.activePiece) return
          if (this.activePiece.location === location) {
            await this.setActivePiece(this.activePiece.location, this.activePiece.entity)
            return
          }

          // @ts-ignore
          const move = this.moves?.find((m: any) => m.from === this.activePiece?.location && m.to === location)
          if (move) {
            if (move.captured) {
              // @ts-ignore
              const capturedPiece = this.pieces.find((piece: Piece) => (
                piece.location === move.to
                && piece.type === move.captured.toUpperCase()
              ))

              if (capturedPiece) {
                capturedPiece.captured = true
                capturedPiece.location = ''
                engine.removeEntity(capturedPiece.entity)
                engine.removeEntity(capturedPiece.wallEntity)
                this.capturedPieces.push(capturedPiece)
                this.setCapturedPiece(capturedPiece)
              }
            }

            if (move.promotion) {
              const promotePrompt = new CustomPrompt(PromptStyles.DARK)
              promotePrompt.closeIcon.visible = false
              promotePrompt.addText('Pawn Promoted!', 10, 150, Color4.White(), 25)
              promotePrompt.addText('What would you like to promote it to?', 10, 100, Color4.White(), 15)
              promotePrompt.addButton('Queen', -100, -20, () => this.promotePawn(this.activePiece!, move, 'q', promotePrompt), ButtonStyles.ROUNDGOLD)
              promotePrompt.addButton('Rook', 100, -20, () => this.promotePawn(this.activePiece!, move, 'r', promotePrompt), ButtonStyles.ROUNDSILVER)
              promotePrompt.addButton('Bishop', -100, -80, () => this.promotePawn(this.activePiece!, move, 'b', promotePrompt), ButtonStyles.ROUNDBLACK)
              promotePrompt.addButton('Knight', 100, -80, () => this.promotePawn(this.activePiece!, move, 'n', promotePrompt), ButtonStyles.ROUNDWHITE)
            } else {
              this.moveLabel.set(move.san)
              if (!config.game.showLastMoveSAN) this.moveLabel.hide()
              await this.setActivePiece(move.from, this.activePiece.entity)
              this.movePiece(move.from, move.to)
              this.hasMoved = true
              try {
                const result = await recordMove({ id: this.id, floor: this.floor.id, move, autoOpponent: config.game.autoOpponent })
                if (!result || result.error) throw new Error('Invalid move')
              } catch (err) {
                log('error recording move')
                this.resetBoard()
              }
            }
          }
        }, {
          hoverText: 'Place Piece',
          showFeedback: Boolean(this.activePiece)
        })
      )
    }

    (board === 'floor' ? this.activeTiles : this.activeWallTiles).push({ location, entity: myEntity })
  }
}
