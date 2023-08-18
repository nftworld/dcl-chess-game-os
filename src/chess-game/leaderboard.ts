/**
 * DCL Chess Game
 * Leaderboard UI
 */

export const leaderboardScale = 1.5
const leaderboardDimension = 2

export type Leaderboard = {
  boardParent: Entity
  playNowPaid: Entity
  playNowFree: Entity
  playNowPaidText: Entity
  playNowFreeText: Entity
}

export function createLeaderboard(x: number, y: number, z: number, xRotate: number, yRotate: number, zRotate: number) {
  const boardParent = new Entity()
  boardParent.addComponent(
    new Transform(
      new Transform({
        position: new Vector3(x, y, z),
        rotation: Quaternion.Euler(xRotate, yRotate, zRotate),
        scale: new Vector3(leaderboardScale, leaderboardScale, leaderboardScale)
      })
    )
  )

  const boardBackgroundMaterial = new Material()
  boardBackgroundMaterial.albedoColor = Color3.Blue()

  const boardBackgroundScale = 7
  const boardBackground = new Entity()
  boardBackground.setParent(boardParent)
  boardBackground.addComponent(new BoxShape())
  boardBackground.getComponent(BoxShape).withCollisions = true
  boardBackground.addComponent(
    new Transform({
      position: new Vector3(-0.5, -0.75, 0.01),
      rotation: Quaternion.Euler(0, 0, 0),
      scale: new Vector3(boardBackgroundScale, boardBackgroundScale / leaderboardDimension, 0.01)
    })
  )
  boardBackground.addComponent(boardBackgroundMaterial)

  const playNowPaidScale = 0.75
  const playNowFreeScale = 0.75

  const playNowPaid = new Entity()
  playNowPaid.addComponent(new PlaneShape())
  playNowPaid.setParent(boardParent)

  const playNowFree = new Entity()
  playNowFree.addComponent(new PlaneShape())
  playNowFree.setParent(boardParent)

  const playNowPaidTexture = new Texture('images/chess-game/PlayNow-Red.png')
  const playNowPaidOrigW = 281
  const playNowPaidOrigH = 117
  const playNowPaidWidthRatio = playNowPaidOrigW / playNowPaidOrigH
  playNowPaid.addComponent(
    new Transform({
      position: new Vector3(-1.45, -1.7, -0.01), //center
      //position: new Vector3(2, -1.8, -0.01), //right
      rotation: Quaternion.Euler(0, 0, 180),
      scale: new Vector3(playNowPaidScale * playNowPaidWidthRatio, playNowPaidScale, 0.01)
    })
  )

  const playNowFreeTexture = new Texture('images/chess-game/PlayNow-Blue.png')
  const playNowFreeOrigW = 281
  const playNowFreeOrigH = 117
  const playNowFreeWidthRatio = playNowFreeOrigW / playNowFreeOrigH
  playNowFree.addComponent(
    new Transform({
      position: new Vector3(0.55, -1.7, -0.01), //center
      //position: new Vector3(2, -1.8, -0.01), //right
      rotation: Quaternion.Euler(0, 0, 180),
      scale: new Vector3(playNowFreeScale * playNowFreeWidthRatio, playNowFreeScale, 0.01)
    })
  )

  const playNowPaidMaterial = new Material()
  playNowPaidMaterial.metallic = 0
  playNowPaidMaterial.roughness = 1
  playNowPaidMaterial.albedoTexture = playNowPaidTexture
  playNowPaidMaterial.alphaTexture = playNowPaidTexture
  playNowPaid.addComponent(playNowPaidMaterial)

  const playNowFreeMaterial = new Material()
  playNowFreeMaterial.metallic = 0
  playNowFreeMaterial.roughness = 1
  playNowFreeMaterial.albedoTexture = playNowFreeTexture
  playNowFreeMaterial.alphaTexture = playNowFreeTexture
  playNowFree.addComponent(playNowFreeMaterial)

  const playNowPaidText = new Entity()
  const playNowPaidTextShape = new TextShape('Paid Game')
  playNowPaidTextShape.fontSize = 1
  playNowPaidTextShape.color = Color3.White()
  playNowPaidText.setParent(playNowPaid)
  playNowPaidText.addComponent(playNowPaidTextShape)
  playNowPaidText.addComponent(
    new Transform({
      position: new Vector3(0, -0.65, 0),
      rotation: Quaternion.Euler(0, 0, 180),
      scale: new Vector3(1, 1 * leaderboardDimension, 1)
    })
  )

  const playNowFreeText = new Entity()
  const playNowFreeTextShape = new TextShape('Free Game')
  playNowFreeTextShape.fontSize = 1
  playNowFreeTextShape.color = Color3.White()
  playNowFreeText.setParent(playNowFree)
  playNowFreeText.addComponent(playNowFreeTextShape)
  playNowFreeText.addComponent(
    new Transform({
      position: new Vector3(0, -0.65, 0),
      rotation: Quaternion.Euler(0, 0, 180),
      scale: new Vector3(1, 1 * leaderboardDimension, 1)
    })
  )

  return { boardParent, playNowPaid, playNowFree, playNowPaidText, playNowFreeText }
}

export async function updateBoard(leaderboard: any[], boardParent: Entity) {
  try {
    const scoreData: any = []
    for (const user of leaderboard.slice(0, 5).filter((u: any) => u.wins || u.losses)) {
      if (!user.name) user.name = user.address
      const displayName = /^0x/.test(user.name) ? user.name.slice(0, 6) + '...' + user.name.slice(-4) : user.name

      scoreData.push({
        name: displayName,
        wins: user.wins || 0,
        losses: user.losses || 0
      })
    }

    buildLeaderBoard(scoreData, boardParent, scoreData.length).catch((error: any) => log(error))
  } catch (err) {
    log(err)
  }
}

const TitleFont = new Font(Fonts.SansSerif_Heavy)
const SFFont = new Font(Fonts.SansSerif)

export enum TextTypes {
  BIGTITLE = 'bigtitle',
  BIGVALUE = 'bigvalue',
  TITLE = 'title',
  LABEL = 'label',
  VALUE = 'value',
  UNIT = 'unit',
  TINYVALUE = 'tinyvalue',
  TINYTITLE = 'tinytitle'
}

export class ScoreBoardText extends Entity {
  constructor(type: TextTypes, text: string, transform: TranformConstructorArgs, parent: Entity) {
    super()
    engine.addEntity(this)

    this.addComponent(new Transform(transform))
    this.setParent(parent)

    const shape = new TextShape(text)

    shape.width = 10

    switch (type) {
      case TextTypes.BIGTITLE:
        shape.fontSize = 4
        shape.color = Color3.White()
        shape.vTextAlign = 'center'
        shape.font = TitleFont
        break
      case TextTypes.BIGVALUE:
        shape.fontSize = 3
        shape.color = Color3.Green()
        shape.vTextAlign = 'center'
        shape.font = TitleFont
        break

      case TextTypes.TITLE:
        shape.fontSize = 3
        shape.color = Color3.White()
        shape.vTextAlign = 'center'
        shape.width = 10
        shape.font = TitleFont
        break
      case TextTypes.TINYTITLE:
        shape.fontSize = 2
        shape.color = Color3.White()
        shape.vTextAlign = 'center'
        shape.width = 10
        shape.font = SFFont
        break
      case TextTypes.LABEL:
        shape.fontSize = 3
        shape.color = Color3.White()
        shape.vTextAlign = 'left'
        shape.font = SFFont
        break
      case TextTypes.VALUE:
        shape.fontSize = 3
        shape.color = Color3.Green()
        shape.vTextAlign = 'right'
        shape.font = SFFont
        break
      case TextTypes.TINYVALUE:
        shape.fontSize = 2
        shape.color = Color3.Green()
        shape.vTextAlign = 'right'
        shape.font = SFFont
        break

      case TextTypes.UNIT:
        shape.fontSize = 2
        shape.color = Color3.White()
        shape.vTextAlign = 'right'
        shape.font = SFFont
        break
    }

    this.addComponent(shape)
  }
}

export async function buildLeaderBoard(scoreData: any[], parent: Entity | any, length: number) {
  // if canvas is empty
  if (!parent.scoreBoardRecords) parent.scoreBoardRecords = []
  if (parent.scoreBoardRecords.length === 0) {
    new ScoreBoardText(
      TextTypes.BIGTITLE,
      'Player',
      {
        position: new Vector3(-3, 0.65, 0)
      },
      parent
    )

    new ScoreBoardText(
      TextTypes.BIGTITLE,
      'Wins',
      {
        position: new Vector3(-0.5, 0.65, 0)
      },
      parent
    )

    new ScoreBoardText(
      TextTypes.BIGTITLE,
      'Losses',
      {
        position: new Vector3(2, 0.65, 0)
      },
      parent
    )

    for (let i = 0; i < length; i++) {
      if (i < scoreData.length) {
        const name = new ScoreBoardText(
          TextTypes.TINYTITLE,
          scoreData[i].name,
          {
            position: new Vector3(-3, 0.2 - i / 4, 0)
          },
          parent
        )

        const wins = new ScoreBoardText(
          TextTypes.TINYVALUE,
          scoreData[i].wins.toString(),
          {
            position: new Vector3(-0.5, 0.2 - i / 4, 0)
          },
          parent
        )

        const losses = new ScoreBoardText(
          TextTypes.TINYVALUE,
          scoreData[i].losses.toString(),
          {
            position: new Vector3(2, 0.2 - i / 4, 0)
          },
          parent
        )

        parent.scoreBoardRecords.push({ name, wins, losses })
      } else {
        // create empty line

        new ScoreBoardText(
          TextTypes.TINYTITLE,
          '-',
          {
            position: new Vector3(-3, 0.2 - i / 4, 0)
          },
          parent
        )

        new ScoreBoardText(
          TextTypes.TINYVALUE,
          '-',
          {
            position: new Vector3(-1.5, 0.2 - i / 4, 0)
          },
          parent
        )

        new ScoreBoardText(
          TextTypes.TINYVALUE,
          '-',
          {
            position: new Vector3(0, 0.2 - i / 4, 0)
          },
          parent
        )

        new ScoreBoardText(
          TextTypes.TINYVALUE,
          '-',
          {
            position: new Vector3(1.8, 0.2 - i / 4, 0)
          },
          parent
        )
      }
    }
  } else {
    // update existing board
    for (let i = 0; i < length; i++) {
      if (i > scoreData.length) continue
      parent.scoreBoardRecords[i].name.getComponent(TextShape).value = scoreData[i].name
      parent.scoreBoardRecords[i].wins.getComponent(TextShape).value = scoreData[i].wins
      parent.scoreBoardRecords[i].losses.getComponent(TextShape).value = scoreData[i].losses
    }
  }
}
