export const uiCanvas = new UICanvas()

// We must use a function due to multiple gameplay systems
export const createCancelButton = () => {
  const cancelButton = new UIImage(uiCanvas, new Texture('images/chess-game/cancel.png'))
  cancelButton.sourceLeft = 0
  cancelButton.sourceTop = 0
  cancelButton.height = 200
  cancelButton.width = 200
  cancelButton.sourceWidth = 512
  cancelButton.sourceHeight = 512
  cancelButton.hAlign = "right"
  cancelButton.positionY = "-310px"
  cancelButton.isPointerBlocker = true
  cancelButton.visible = false
  return cancelButton
}

export const instructionsButton = new UIImage(uiCanvas, new Texture('images/chess-game/instructions_button.png'))
instructionsButton.vAlign = 'top'
instructionsButton.hAlign = "right"
instructionsButton.positionX = "-70px"
instructionsButton.positionY = "51px"
instructionsButton.sourceWidth = 1009
instructionsButton.sourceHeight = 257
instructionsButton.width = 101
instructionsButton.height = 26
instructionsButton.isPointerBlocker = true
instructionsButton.visible = true
instructionsButton.onClick = new OnPointerDown(() => {
    instructions.visible = !instructions.visible
})

export const instructions = new UIImage(uiCanvas, new Texture('images/chess-game/instructions.png'))
instructions.sourceTop = 0
instructions.sourceLeft = 0
instructions.sourceWidth = 1500
instructions.sourceHeight = 1000
instructions.positionY = 30
instructions.width = 900
instructions.height = 600
instructions.isPointerBlocker = true
instructions.visible = false
instructions.opacity = 0.9
instructions.onClick = new OnPointerDown(() => {
    instructions.visible = false
})

const instructionsHeaderPosY = -50

const instructionsHeader = new UIText(instructions)
instructionsHeader.value = "Instructions"
instructionsHeader.color = Color4.Blue()
instructionsHeader.fontSize = 65
instructionsHeader.vAlign = "top"
instructionsHeader.hAlign = "center"
instructionsHeader.positionX = -120
instructionsHeader.positionY = instructionsHeaderPosY
instructionsHeader.outlineWidth = 0.05
instructionsHeader.outlineColor = Color4.White()


const instructionsList = new UIText(instructions)
instructionsList.value = "1. Dont leave the scene while your transaction is pending\n" +
    "2. There is a timer limit of 1 minute per turn\n" +
    "3. If you fail to make a move before the timer runs out, a move will be made for you at random\n" +
    "4. If you time out 3 times, you lose\n" +
    "5. Avatars are hidden from the board"
instructionsList.lineSpacing = 20
instructionsList.color = Color4.White()
instructionsList.fontSize = 19
instructionsList.vAlign = "center"
instructionsList.hAlign = "left"
instructionsList.positionX = 15
instructionsList.positionY = instructionsHeaderPosY + 125
instructionsList.adaptWidth = true
instructionsList.textWrapping = false

const payoutsPosYadj = -300

const payoutssHeader = new UIText(instructions)
payoutssHeader.value = "Payouts"
payoutssHeader.color = Color4.Blue()
payoutssHeader.fontSize = 65
payoutssHeader.vAlign = "top"
payoutssHeader.hAlign = "center"
payoutssHeader.positionX = -120
payoutssHeader.positionY = payoutsPosYadj
payoutssHeader.outlineWidth = 0.05
payoutssHeader.outlineColor = Color4.White()

const payoutsList = new UIText(instructions)
payoutsList.value = "Gameplay fee: 5 MANA\n" +
    "Winner receives 9 MANA"
payoutsList.lineSpacing = 20
payoutsList.color = Color4.White()
payoutsList.fontSize = 19
payoutsList.vAlign = "center"
payoutsList.hAlign = "left"
payoutsList.positionX = 15
payoutsList.positionY = payoutsPosYadj + 200
payoutsList.adaptWidth = true
payoutsList.textWrapping = false