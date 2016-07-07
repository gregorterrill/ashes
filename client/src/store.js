export default {

	socket: io(),
	socketId: '',
	username: 'Anonymous',
	gameList: [],
  state: {}
}

// Most of the data will be stored in state.players, like this:
// players: Object
// /#A_rJuPzXB682fv8iAAAB: Object
//   position: 2
//   username: "Bilbo Swaggins"
//   conjurations: Array[5]
//   deck: Array[30]
//   dice: Array[10]
//   discard: Array[0]
//   pheonixborn: "Jessa Na Ni"
//     life: 20
//     tokens:
//       wound: 4
//       status: 0
//       exhaustion: 0
//   spellboard:
//     stuff
//   battlefield:
//     stuff
// /#fG_RhlizRiUXuzy7AAAq: Object