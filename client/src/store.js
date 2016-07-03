export default {

	socket: io(),
	socketId: '',
	username: 'Anonymous',
	gameList: [],

  state: {
    gameId: '',
    gameRound: -1,
    chatLog: [],
    players: []   
  }


}