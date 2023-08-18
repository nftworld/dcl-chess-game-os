// This file sets up the board and pieces
// gameplay-system.ts handles most of the multiplayer/turn logic
// gameplaySystem.addPiece() is used to add physical pieces for tracking

import config from './config'
import * as Functions from '../globalfunctions'
import { undoRound } from './backend'
import { PieceType } from './gameplay-system'
import { Floor } from './floor-manager'

export class gallery2 extends Entity {
  galleryScenePosX = config.scene.xBase ?? 0
  galleryScenePosY = config.scene.yBase ?? 20
  galleryScenePosZ = config.scene.zBase ?? -1

  gallerysceneRot1 = config.scene.xRotate ?? 0
  gallerysceneRot2 = config.scene.yRotate ?? 0
  gallerysceneRot3 = config.scene.zRotate ?? 0

  artDisplayed = false
  testing = false

  constructor() {
    super()
    this.addComponent(
      new Transform({
        position: new Vector3(this.galleryScenePosX * 16, this.galleryScenePosY, this.galleryScenePosZ * 16),
        rotation: Quaternion.Euler(this.gallerysceneRot1, this.gallerysceneRot2, this.gallerysceneRot3)
      })
    )
    engine.addEntity(this)

    const gallery = new Entity()
    gallery.setParent(this)
    gallery.addComponent(
      new Transform({
        position: new Vector3(16.7, -0.225, 16),
        scale: new Vector3(1, 1, 1)
      })
    )

    // these are defined here in order to use them when creating the elevator buttons so that it knows where to move the player to
    let middleFloorPosY = 16
    const middleFloorPosYadj = 9.42

    let floor = 1
    const bottom_floor = new Entity()
    bottom_floor.addComponent(new GLTFShape('models/chess-game/Bottom_floor+collider.glb'))
    bottom_floor.addComponent(
      new Transform({
        position: new Vector3(0, -3, 0),
        scale: new Vector3(1, 1, 1)
      })
    )
    bottom_floor.setParent(gallery)
    bottom_floor.name = "floor" + floor

    //the first floor ceiling is higher than the other floors so we use middleFloorPosY instead of middleFloorPosYadj
    Functions.addElevatorGoingUp(floor, "floor" + floor, middleFloorPosY + 5, bottom_floor)
    floor++

    for (let i = 0; i <= 3; i++) {

      const middle_Floor = Functions.addMiddleFloor(floor, "floor" + floor, middleFloorPosY, gallery)

      Functions.addElevatorGoingUp(floor, "floor" + floor, middleFloorPosYadj, middle_Floor)

      if (i === 0) Functions.addElevatorGoingDown(floor, "floor" + floor, middleFloorPosY, middle_Floor) //first floor
      else Functions.addElevatorGoingDown(floor, "floor" + floor, middleFloorPosYadj, middle_Floor)

      floor++
      middleFloorPosY += middleFloorPosYadj
    }


    const top_floor = new Entity()
    top_floor.addComponent(new GLTFShape('models/chess-game/Top_floor+collider.glb'))
    top_floor.addComponent(
      new Transform({
        position: new Vector3(0, middleFloorPosY - 0.2, 0),
        scale: new Vector3(1, 1, 1)
      })
    )
    top_floor.setParent(gallery)
    top_floor.name = "floor" + floor
    Functions.addElevatorGoingDown(floor, "floor" + floor, middleFloorPosYadj, top_floor)

    Functions.showChessImg(
      '',
      '',
      this.testing ? '' : 'images/chess-game/mj.png',
      1369,
      538,
      2.5,
      'https://opensea.io/accounts/MehakJain?ref=0xa2Dac1e8d4C07D22aB5491dEFdcb52D293a11Db3',
      19.8,
      5,
      29.4,
      180,
      0,
      0,
      false,
      'logo',
      this
    )
  }

  displayGame(floor: Floor) {
    const { gameplaySystem } = floor
    if (!gameplaySystem) return

    const { myEntity } = Functions.showChessImg(
      '',
      '',
      this.testing ? '' : 'images/chess-game/battlelowres2500x1220.png',
      2500,
      1220,
      floor.id === 0 ? 13 : 8,
      'https://opensea.io/assets/0xe581b0b9de822aff8f9d8ae16d806df756a6a689/1?ref=0xa2Dac1e8d4C07D22aB5491dEFdcb52D293a11Db3',
      16,
      floor.id === 0 ? 10.5 : 5 + floor.y,
      2.1,
      180,
      180,
      0,
      false,
      'mural',
      this
    )

    if (config.game.allowUndo) {
      myEntity.addComponentOrReplace(
        new OnPointerDown(async () => {
          if (!gameplaySystem.id) return
          await undoRound(gameplaySystem.id, floor.id)
          gameplaySystem.resetBoard()
          gameplaySystem.id = undefined
        })
      )
    }

    const chessSetScale = 3.1
    const upperFloorsWallboardScale = 0.85
    const squareSize = 100
    const squareScale = 1
    let squarePosX = 1
    let squarePosZ = 2.5
    let leadWithBlack = true
    let billboardEntity

    const floorChessBoard = createChessBoard(
      new Vector3(32, floor.id === 0 ? 0.17 : floor.y, 32.5),
      Quaternion.Euler(0, 180, 0),
      new Vector3(chessSetScale, chessSetScale, chessSetScale),
      true,
      this,
      'f'
    )

    const wallboardY =
      floor.y + (
        floor.id === 0
        ? (-(config.scene.yBase || 0) + 11)
        : ((config.scene.yBase || 20) - 10.7)
      )

    createChessBoard(
      new Vector3(config.scene.xBase + 30.25, wallboardY, config.scene.zBase + 29),
      Quaternion.Euler(-180, 0, 90),
      Vector3.Zero(),
      false,
      this,
      'w'
    )

    gameplaySystem.events.on('chess:game:started', () => {
      if (gameplaySystem.wallBoardEntity) gameplaySystem.wallBoardEntity.getComponent(Transform).scale = Vector3.One()

      const wallBoardTransform = gameplaySystem.wallBoardEntity?.getComponent(Transform)
      if (wallBoardTransform && floor.id > 0) {
        wallBoardTransform.scale = new Vector3(upperFloorsWallboardScale, upperFloorsWallboardScale, upperFloorsWallboardScale)
        wallBoardTransform.position = new Vector3(config.scene.xBase + 30.25, wallboardY, config.scene.zBase + 26.8)
      }

      gameplaySystem.hideLeaderboard()
    })

    function createChessBoard(
      pos: Vector3,
      rot: Quaternion,
      scl: Vector3,
      playableBoard: boolean,
      parent: Entity,
      board: string
    ) {
      const chessBoard = new Entity()
      if (playableBoard) gameplaySystem.floorBoardEntity = chessBoard
      else gameplaySystem.wallBoardEntity = chessBoard

      chessBoard.addComponent(
        new Transform({
          position: playableBoard ? pos : new Vector3(pos.x, pos.y, pos.z),
          rotation: rot,
          scale: scl
        })
      )

      chessBoard.setParent(parent)

      for (let i = 0; i < 8; i++) {
        //rows (ranks)
        squarePosX = 1.5
        let codeOffset = 0

        for (let j = 0; j < 4; j++) {
          //columns (files)
          const code = j + 97 + codeOffset

          const imgOptions = {
            artistRotationX: 180,
            titleRotationX: 180,
            artistPaddingTop: -10,
            titlePaddingTop: -10
          }

          if (leadWithBlack) {
            let file = String.fromCharCode(code)
            const rank = i + 1
            let location = `${file}${rank}`
            if (playableBoard) gameplaySystem.board[location] = { file, rank, x: squarePosX, z: squarePosZ, board }
            else gameplaySystem.wallBoard[location] = { file, rank, x: squarePosX, z: squarePosZ, board }

            Functions.showChessImg(
              config.game.showTileInfo ? `X:${squarePosX}, Z:${squarePosZ}` : '',
              config.game.showTileInfo ? location : '',
              'images/chess-game/black_100x100.png',
              squareSize,
              squareSize,
              squareScale,
              '',
              squarePosX,
              0,
              squarePosZ,
              90,
              0,
              90,
              false,
              'blackTile',
              chessBoard,
              imgOptions
            )

            file = String.fromCharCode(code + 1)
            location = `${file}${rank}`
            if (playableBoard) gameplaySystem.board[location] = { file, rank, x: squarePosX + 1, z: squarePosZ, board }
            else gameplaySystem.wallBoard[location] = { file, rank, x: squarePosX + 1, z: squarePosZ, board }

            Functions.showChessImg(
              config.game.showTileInfo ? `X:${squarePosX + 1}, Z:${squarePosZ}` : '',
              config.game.showTileInfo ? location : '',
              'images/chess-game/gold_100x100.png',
              squareSize,
              squareSize,
              squareScale,
              '',
              squarePosX + 1,
              0,
              squarePosZ,
              90,
              0,
              90,
              false,
              'goldTile',
              chessBoard,
              imgOptions
            )
          } else {
            let file = String.fromCharCode(code)
            const rank = i + 1
            let location = `${file}${rank}`
            if (playableBoard) gameplaySystem.board[location] = { file, rank, x: squarePosX, z: squarePosZ, board }
            else gameplaySystem.wallBoard[location] = { file, rank, x: squarePosX, z: squarePosZ, board }

            Functions.showChessImg(
              config.game.showTileInfo ? `X:${squarePosX}, Z:${squarePosZ}` : '',
              config.game.showTileInfo ? location : '',
              'images/chess-game/gold_100x100.png',
              squareSize,
              squareSize,
              squareScale,
              '',
              squarePosX,
              0,
              squarePosZ,
              90,
              0,
              90,
              false,
              'goldTile',
              chessBoard,
              imgOptions
            )

            file = String.fromCharCode(code + 1)
            location = `${file}${rank}`
            if (playableBoard) gameplaySystem.board[location] = { file, rank, x: squarePosX + 1, z: squarePosZ, board }
            else gameplaySystem.wallBoard[location] = { file, rank, x: squarePosX + 1, z: squarePosZ, board }

            Functions.showChessImg(
              config.game.showTileInfo ? `X:${squarePosX + 1}, Z:${squarePosZ}` : '',
              config.game.showTileInfo ? location : '',
              'images/chess-game/black_100x100.png',
              squareSize,
              squareSize,
              squareScale,
              '',
              squarePosX + 1,
              0,
              squarePosZ,
              90,
              0,
              90,
              false,
              'blackTile',
              chessBoard,
              imgOptions
            )
          }

          squarePosX += 2
          codeOffset++
        }

        leadWithBlack = !leadWithBlack
        squarePosZ++
      }

      return chessBoard
    }

    //############################### Black Set

    let piecePosX = 1.5
    let piecePosZ = 8.5
    let pieceScale = 2.5

    const blackPawnShape = new GLTFShape('models/chess-game/chess_sets/black/pawn.glb')
    gameplaySystem.shapes.black.pawn = blackPawnShape

    for (let i = 0; i <= 7; i++) {
      const blackPawn = new Entity()
      const file = String.fromCharCode(i + 97) // Black's starting file; 97 is 'a'
      const rank = 7 // Black's starting rank
      const location = `${file}${rank}`

      blackPawn.setParent(floorChessBoard)
      blackPawn.addComponent(blackPawnShape)
      blackPawn.addComponent(
        new Transform({
          position: new Vector3(piecePosX, 0, piecePosZ),
          rotation: Quaternion.Euler(0, 0, 0),
          scale: new Vector3(pieceScale, pieceScale, pieceScale)
        })
      )

      billboardEntity = Functions.showText(
        'Pawn',
        new Vector3(0, 0.3, 0),
        Quaternion.Euler(0, 0, 0),
        0.025,
        blackPawn,
        true
      )

      gameplaySystem.addPiece(location, blackPawn, billboardEntity, 'black', PieceType.Pawn, {
        x: piecePosX,
        z: piecePosZ,
        pieceScale,
        location
      })

      piecePosX++
    }

    //back row
    pieceScale = 4.75

    piecePosX = 1.5
    piecePosZ = 9.5

    const blackRookShape = new GLTFShape('models/chess-game/chess_sets/black/rook.glb')
    gameplaySystem.shapes.black.rook = blackRookShape

    const blackRook = new Entity()
    blackRook.setParent(floorChessBoard)
    blackRook.addComponent(blackRookShape)
    blackRook.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 0, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Rook',
      new Vector3(0, 0.29, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      blackRook,
      true
    )

    gameplaySystem.addPiece('a8', blackRook, billboardEntity, 'black', PieceType.Rook, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'a8'
    })

    piecePosX = 8.5

    const blackRook2 = new Entity()
    blackRook2.setParent(floorChessBoard)
    blackRook2.addComponent(blackRookShape)
    blackRook2.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 0, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Rook',
      new Vector3(0, 0.29, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      blackRook2,
      true
    )

    gameplaySystem.addPiece('h8', blackRook2, billboardEntity, 'black', PieceType.Rook, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'h8'
    })

    piecePosX = 2.5

    const blackKnightShape = new GLTFShape('models/chess-game/chess_sets/black/knight.glb')
    gameplaySystem.shapes.black.knight = blackKnightShape

    const blackKnight = new Entity()
    blackKnight.setParent(floorChessBoard)
    blackKnight.addComponent(blackKnightShape)
    blackKnight.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 180, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Knight',
      new Vector3(0, 0.24, 0),
      Quaternion.Euler(0, 180, 0),
      0.025,
      blackKnight,
      true
    )

    gameplaySystem.addPiece('b8', blackKnight, billboardEntity, 'black', PieceType.Knight, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'b8'
    })

    piecePosX = 7.5

    const blackKnight2 = new Entity()
    blackKnight2.setParent(floorChessBoard)
    blackKnight2.addComponent(blackKnightShape)
    blackKnight2.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 180, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Knight',
      new Vector3(0, 0.24, 0),
      Quaternion.Euler(0, 180, 0),
      0.025,
      blackKnight2,
      true
    )

    gameplaySystem.addPiece('g8', blackKnight2, billboardEntity, 'black', PieceType.Knight, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'g8'
    })

    piecePosX = 3.5

    const blackBishopShape = new GLTFShape('models/chess-game/chess_sets/black/bishop.glb')
    gameplaySystem.shapes.black.bishop = blackBishopShape

    const blackBishop = new Entity()
    blackBishop.setParent(floorChessBoard)
    blackBishop.addComponent(blackBishopShape)
    blackBishop.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 0, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Bishop',
      new Vector3(0, 0.27, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      blackBishop,
      true
    )

    gameplaySystem.addPiece('c8', blackBishop, billboardEntity, 'black', PieceType.Bishop, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'c8'
    })

    piecePosX = 6.5

    const blackBishop2 = new Entity()
    blackBishop2.setParent(floorChessBoard)
    blackBishop2.addComponent(blackBishopShape)
    blackBishop2.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 0, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Bishop',
      new Vector3(0, 0.27, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      blackBishop2,
      true
    )

    gameplaySystem.addPiece('f8', blackBishop2, billboardEntity, 'black', PieceType.Bishop, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'f8'
    })

    piecePosX = 5.5

    const blackKingShape = new GLTFShape('models/chess-game/chess_sets/black/king.glb')
    gameplaySystem.shapes.black.king = blackKingShape

    const blackKing = new Entity()
    blackKing.setParent(floorChessBoard)
    blackKing.addComponent(blackKingShape)
    blackKing.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 0, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'King',
      new Vector3(0, 0.3, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      blackKing,
      true
    )

    gameplaySystem.addPiece('e8', blackKing, billboardEntity, 'black', PieceType.King, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'e8'
    })

    pieceScale = 6 //queen is smaller than the others
    piecePosX = 4.5

    const blackQueenShape = new GLTFShape('models/chess-game/chess_sets/black/queen.glb')
    gameplaySystem.shapes.black.queen = blackQueenShape

    const blackQueen = new Entity()
    blackQueen.setParent(floorChessBoard)
    blackQueen.addComponent(blackQueenShape)
    blackQueen.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 0, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Queen',
      new Vector3(0, 0.23, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      blackQueen,
      true
    )

    gameplaySystem.addPiece('d8', blackQueen, billboardEntity, 'black', PieceType.Queen, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'd8'
    })

    //############################### White Set

    piecePosX = 1.5
    piecePosZ = 8.5 - 5
    pieceScale = 2.5

    const whitePawnShape = new GLTFShape('models/chess-game/chess_sets/white/pawn.glb')
    gameplaySystem.shapes.white.pawn = whitePawnShape

    for (let i = 0; i <= 7; i++) {
      const whitePawn = new Entity()
      const file = String.fromCharCode(i + 97) // White's starting file; 97 is 'a'
      const rank = 2 // White's starting rank
      const location = `${file}${rank}`

      whitePawn.setParent(floorChessBoard)
      whitePawn.addComponent(whitePawnShape)
      whitePawn.addComponent(
        new Transform({
          position: new Vector3(piecePosX, 0, piecePosZ),
          rotation: Quaternion.Euler(0, 180, 0),
          scale: new Vector3(pieceScale, pieceScale, pieceScale)
        })
      )

      billboardEntity = Functions.showText(
        'Pawn',
        new Vector3(0, 0.2125, 0),
        Quaternion.Euler(0, 0, 0),
        0.025,
        whitePawn,
        true
      )

      gameplaySystem.addPiece(location, whitePawn, billboardEntity, 'white', PieceType.Pawn, {
        x: piecePosX,
        z: piecePosZ,
        pieceScale,
        location
      })

      piecePosX++
    }

    //back row
    pieceScale = 4.75

    piecePosX = 1.5
    piecePosZ = 9.5 - 7

    const whiteRookShape = new GLTFShape('models/chess-game/chess_sets/white/rook.glb')
    gameplaySystem.shapes.white.rook = whiteRookShape

    const whiteRook = new Entity()
    whiteRook.setParent(floorChessBoard)
    whiteRook.addComponent(whiteRookShape)
    whiteRook.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 180, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Rook',
      new Vector3(0, 0.225, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      whiteRook,
      true
    )

    gameplaySystem.addPiece('a1', whiteRook, billboardEntity, 'white', PieceType.Rook, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'a1'
    })

    piecePosX = 8.5

    const whiteRook2 = new Entity()
    whiteRook2.setParent(floorChessBoard)
    whiteRook2.addComponent(whiteRookShape)
    whiteRook2.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 180, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Rook',
      new Vector3(0, 0.225, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      whiteRook2,
      true
    )

    gameplaySystem.addPiece('h1', whiteRook2, billboardEntity, 'white', PieceType.Rook, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'h1'
    })

    piecePosX = 2.5

    const whiteKnightShape = new GLTFShape('models/chess-game/chess_sets/white/knight.glb')
    gameplaySystem.shapes.white.knight = whiteKnightShape

    const whiteKnight = new Entity()
    whiteKnight.setParent(floorChessBoard)
    whiteKnight.addComponent(whiteKnightShape)
    whiteKnight.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 0, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Knight',
      new Vector3(0, 0.235, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      whiteKnight,
      true
    )

    gameplaySystem.addPiece('b1', whiteKnight, billboardEntity, 'white', PieceType.Knight, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'b1'
    })

    piecePosX = 7.5

    const whiteKnight2 = new Entity()
    whiteKnight2.setParent(floorChessBoard)
    whiteKnight2.addComponent(whiteKnightShape)
    whiteKnight2.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 0, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Knight',
      new Vector3(0, 0.235, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      whiteKnight2,
      true
    )

    gameplaySystem.addPiece('g1', whiteKnight2, billboardEntity, 'white', PieceType.Knight, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'g1'
    })

    piecePosX = 3.5

    const whiteBishopShape = new GLTFShape('models/chess-game/chess_sets/white/bishop.glb')
    gameplaySystem.shapes.white.bishop = whiteBishopShape

    const whiteBishop = new Entity()
    whiteBishop.setParent(floorChessBoard)
    whiteBishop.addComponent(whiteBishopShape)
    whiteBishop.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 180, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Bishop',
      new Vector3(0, 0.24, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      whiteBishop,
      true
    )

    gameplaySystem.addPiece('c1', whiteBishop, billboardEntity, 'white', PieceType.Bishop, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'c1'
    })

    piecePosX = 6.5

    const whiteBishop2 = new Entity()
    whiteBishop2.setParent(floorChessBoard)
    whiteBishop2.addComponent(whiteBishopShape)
    whiteBishop2.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 180, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Bishop',
      new Vector3(0, 0.24, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      whiteBishop2,
      true
    )

    gameplaySystem.addPiece('f1', whiteBishop2, billboardEntity, 'white', PieceType.Bishop, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'f1'
    })

    piecePosX = 5.5

    const whiteKingShape = new GLTFShape('models/chess-game/chess_sets/white/king.glb')
    gameplaySystem.shapes.white.king = whiteKingShape

    const whiteKing = new Entity()
    whiteKing.setParent(floorChessBoard)
    whiteKing.addComponent(whiteKingShape)
    whiteKing.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 180, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'King',
      new Vector3(0, 0.3, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      whiteKing,
      true
    )

    gameplaySystem.addPiece('e1', whiteKing, billboardEntity, 'white', PieceType.King, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'e1'
    })

    pieceScale = 6 //queen is smaller than the others
    piecePosX = 4.5

    const whiteQueenShape = new GLTFShape('models/chess-game/chess_sets/white/queen.glb')
    gameplaySystem.shapes.white.queen = whiteQueenShape

    const whiteQueen = new Entity()
    whiteQueen.setParent(floorChessBoard)
    whiteQueen.addComponent(whiteQueenShape)
    whiteQueen.addComponent(
      new Transform({
        position: new Vector3(piecePosX, 0, piecePosZ),
        rotation: Quaternion.Euler(0, 180, 0),
        scale: new Vector3(pieceScale, pieceScale, pieceScale)
      })
    )

    billboardEntity = Functions.showText(
      'Queen',
      new Vector3(0, 0.2, 0),
      Quaternion.Euler(0, 0, 0),
      0.025,
      whiteQueen,
      true
    )

    gameplaySystem.addPiece('d1', whiteQueen, billboardEntity, 'white', PieceType.Queen, {
      x: piecePosX,
      z: piecePosZ,
      pieceScale,
      location: 'd1'
    })
  }
}
