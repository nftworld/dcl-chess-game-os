/* eslint-disable @typescript-eslint/ban-ts-comment */
import { getUserData } from '@decentraland/Identity'
import { OkPrompt } from '@dcl/ui-scene-utils'

import config from './config'
import { GameplaySystem } from './gameplay-system'
import { createLeaderboard, Leaderboard } from './leaderboard'
import { gallery2 } from './game'
import { instructionsButton } from './user-interface'
import { Interval } from '@dcl/ecs-scene-utils'
import { getCurrentGames, getStats } from './backend'
import { movePlayerTo } from '@decentraland/RestrictedActions'

export class Floor {
  id: number
  y: number
  gameplaySystem: GameplaySystem
  leaderboard: Leaderboard
  floorManager: FloorManager

  constructor(gallery: Entity, id: number, y: number, floorManager: FloorManager) {
    this.id = id
    this.y = y

    this.gameplaySystem = new GameplaySystem(this)
    this.floorManager = floorManager

    this.leaderboard = createLeaderboard(30.1, 5.5 + y - (id ? 0 : config.scene.yBase), 13, 0, 90, 0)
    this.leaderboard.boardParent.setParent(gallery)
    this.gameplaySystem.leaderboard = this.leaderboard

    if (config.game.enablePaidGames) {
      this.leaderboard.playNowPaid.addComponent(
        // Play now button clicked; collect fee and register user
        new OnPointerDown(
          async () => {
            const user = await getUserData()
            if (!user?.publicKey) return
            if (this.gameplaySystem.players.length === 2)
              return new OkPrompt('This game has the maximum number of players')

            if (this.gameplaySystem.state !== 'Registration')
              return new OkPrompt('The game is still loading, please try again in a moment')

            if (floorManager.isPlayerRegistered(user.publicKey))
              return new OkPrompt('You are already registered in a game')

            new OkPrompt(
              `The next signature request is to pay the ${config.fees.entryFee} Polygon MANA entry fee`,
              () => {
                void (async () => {
                  const user = await getUserData()
                  if (!user?.publicKey) return

                  try {
                    const txText = new UIText(this.gameplaySystem.uiCanvas)
                    txText.value = 'Transaction pending...'
                    txText.fontAutoSize = true

                    this.leaderboard.playNowFree.getComponent(PlaneShape).visible = false
                    this.leaderboard.playNowFreeText.getComponent(TextShape).visible = false

                    const tx: any = await this.gameplaySystem.feeProvider.registerUser(user.publicKey)
                    txText.visible = false

                    log('game:tx', tx)

                    if (tx?.error) throw new Error(tx.error)
                    if (!tx?.txId) throw new Error('Transaction failed')
                    await this.gameplaySystem.addPlayer(user.publicKey, tx.txId)

                    // ----------------------------------------------------------------------------------------
                    // For local single player testing, add another player
                    for (const fakeUser of config.game.fakeUsers) await this.gameplaySystem.addPlayer(fakeUser, '0x12345')
                    // ----------------------------------------------------------------------------------------
                  } catch (err: any) {
                    log('registerUser:error', err.message)
                    this.leaderboard.playNowPaid.getComponent(PlaneShape).visible = true
                    this.leaderboard.playNowPaidText.getComponent(TextShape).visible = true
                    this.leaderboard.playNowFree.getComponent(PlaneShape).visible = true
                    this.leaderboard.playNowFreeText.getComponent(TextShape).visible = true
                    return new OkPrompt(err.message)
                  }
                })()
              }
            )
          },
          { hoverText: "Play Paid Game", distance: 20 }
        )
      )
    } else {
      this.leaderboard.playNowPaid.addComponent(
        new OnPointerDown(
          () => {
            new OkPrompt('Paid games are currently disabled')
          },
          {
            button: ActionButton.ANY,
            hoverText: "Paid Games Disabled"
          }
        )
      )
    }

    this.leaderboard.playNowFree.addComponent(
      new OnPointerDown(
        async () => {
          const user = await getUserData()
          if (!user?.publicKey) return
          if (this.gameplaySystem.players.length === 2)
            return new OkPrompt('This game has the maximum number of players')

          if (this.gameplaySystem.state !== 'Registration')
            return new OkPrompt('The game is still loading, please try again in a moment')

          if (floorManager.isPlayerRegistered(user.publicKey))
            return new OkPrompt('You are already registered in a game')

          this.leaderboard.playNowPaid.getComponent(PlaneShape).visible = false
          this.leaderboard.playNowPaidText.getComponent(TextShape).visible = false
          await this.gameplaySystem.addPlayer(user.publicKey)

          // ----------------------------------------------------------------------------------------
          // For local single player testing, add another player
          for (const fakeUser of config.game.fakeUsers) await this.gameplaySystem.addPlayer(fakeUser)
          // ----------------------------------------------------------------------------------------
        },
        { hoverText: "Play Free Game", 
        distance: 20 }
      )
    )
  }
}

export class FloorManager implements ISystem {
  floors: Floor[] = []
  floorCount: number = config.game.floors
  gallery: Entity
  inBuilding: boolean = false

  constructor(gallery: Entity) {
    engine.addSystem(this)
    this.gallery = gallery
    this.createFloors()
  }

  isPlayerRegistered(publicKey: string) {
    for (const floor of this.floors) {
      // @ts-ignore
      if (floor.gameplaySystem.players.includes(publicKey)) return true
    }

    return false
  }

  showUI() {
    instructionsButton.visible = true
  }

  hideUI() {
    instructionsButton.visible = false

    for (const floor of this.floors) {
      floor.gameplaySystem.timeoutsLabel.set('')
      floor.gameplaySystem.turnLabel.set('')
      floor.gameplaySystem.timeLabel.set('')
      floor.gameplaySystem.checkLabel.set('')
    }
  }

  createFloors() {
    for (let i = 0; i < this.floorCount; i++) {
      const floorY = !i ? config.scene.yBase + (config.scene.floorYDeltas[i] * i) : (config.scene.floorYDeltas[i] * i)
      const floor = new Floor(this.gallery, i, floorY, this)
      this.floors.push(floor)
    }
  }

  update() {
    const { x, y, z } = Camera.instance.position
    this.inBuilding = x > (config.scene.xMinBoundary ?? 0)
      && x < (config.scene.xMaxBoundary ?? 29)
      && y > (config.scene.yMinBoundary ?? 20)
      && y < (config.scene.yMaxBoundary ?? 80)
      && z > (config.scene.zMinBoundary ?? 0)
      && z < (config.scene.zMaxBoundary ?? 29)

    if (!this.inBuilding) this.hideUI()
    else this.showUI()

    if (!this.inBuilding && config.scene.devWarp) {
      // log(x, y, z)
      void movePlayerTo({ x: config.scene.xMaxBoundary / 2, y: config.scene.yBase + 1, z: config.scene.zMaxBoundary / 2 })
    }
  }
}

export class StateSyncer {
  stateSyncEntity: Entity
  leaderboardSyncEntity: Entity
  errorCount: number = 0

  constructor(floorManager: FloorManager) {
    this.stateSyncEntity = new Entity()
    this.leaderboardSyncEntity = new Entity()

    this.stateSyncEntity.addComponent(
      new Interval(config.backend.stateSyncInterval, async () => {
        if (!floorManager.inBuilding) return
        if (this.errorCount < 0) return
        if (this.errorCount >= config.backend.giveUp) {
          new OkPrompt('Error connecting to server. Please refresh or try again later.')
          this.errorCount = -1
        }

        try {
          const data = await getCurrentGames()
          // @ts-ignore
          for (const [floor, game] of Object.entries(data)) {
            void floorManager.floors[Number(floor)]?.gameplaySystem.syncState(game.id, game.game)
          }
        } catch (err: any) {
          log('getCurrentGames:error', err.message)
          this.errorCount++
        }
      })
    )

    this.leaderboardSyncEntity.addComponent(
      new Interval(config.backend.leaderboardSyncInterval, async () => {
        if (!floorManager.inBuilding) return
        try {
          const data = await getStats()
          for (const floor of floorManager.floors) {
            if (floor.gameplaySystem.state === 'Registration') floor.gameplaySystem.leaderboardData = data
          }
        } catch (err: any) {
          log('getStats:error', err.message)
        }
      })
    )

    engine.addEntity(this.stateSyncEntity)
    engine.addEntity(this.leaderboardSyncEntity)
  }
}

const gallery = new gallery2()
export const floorManager = new FloorManager(gallery)
for (const floor of floorManager.floors) gallery.displayGame(floor)
gallery.artDisplayed = true

export const stateSyncer = new StateSyncer(floorManager)
