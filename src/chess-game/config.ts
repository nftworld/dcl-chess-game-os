export default {
  backend: {
    giveUp: 50, // Give up after this many errors
    stateSyncInterval: 500, // ms
    leaderboardSyncInterval: 5000, // ms
    // url: 'https://example.ngrok-free.app/projectid/region' // use ngrok for local emulators (DCL requires https)
    url: 'https://region-projectid.cloudfunctions.net'
  },

  game: {
    floors: 5, // How many concurrent games should run
    enablePaidGames: false, // Set to true to enable paid games
    showTileInfo: false, // Show info on each tile - for development
    allowUndo: false, // Allow undoing a round by clicking the black side's mural - for development
    timeControl: false, // Standard chess time control
    timedTurns: true, // Simple timed turns
    timedTurnsTimeoutLimit: 3, // Sow many timeouts before loss
    showLastMoveSAN: false, // Show the SAN of the last move in the lower right corner
    logState: false, // Log the game state to the console every sync, including the ASCII board
    differentialLogState: true, // Only log the game state if it has changed; requires logState to be true
    enableBugReports: false, // Turn on bug reporting
    autoOpponent: false, // If true, use a fakeUser - for development
    fakeUsers: [] // User address to use for autoOpponent - for development
  },

  scene: {
    xBase: 0,
    yBase: 0,
    zBase: -1,
    xRotate: 0,
    yRotate: 0,
    zRotate: 0,
    xMaxBoundary: 31,
    yMaxBoundary: 80,
    zMaxBoundary: 14,
    xMinBoundary: -3.5,
    yMinBoundary: 0,
    zMinBoundary: -14,
    floorYDeltas: [0, 17.25, 13.3, 12.01, 11.38, 11],
    devWarp: false
  },

  fees: {
    entryFee: 0.001,
    skip: false, // For development, paid games don't collect fees
    metaTxServer: undefined, // Define to use a custom meta tx server
    escrowAddress: '0xYOURADDRESSHERE'
  }
}
