//   _____ ____  _   _ ______ _____ _____
//  / ____/ __ \| \ | |  ____|_   _/ ____|
// | |   | |  | |  \| | |__    | || |  __
// | |   | |  | | . ` |  __|   | || | |_ |
// | |___| |__| | |\  | |     _| || |__| |
//  \_____\____/|_| \_|_|    |_____\_____|

// -----------------------------------------------------------[ ]
// dependencies
var express = require('express');
var app = express();
var http = require('http').Server(app);
var server = require('socket.io')(http);
var _ = require('underscore');
var path = require('path');

// make public dir available
var publicDir = path.join(__dirname, '../client/public');
app.use(express.static('../client/public'));

// load list data and setup script
var lists = require('./data/decks.json');
var setup = require('./controllers/game-setup.js');
var userActions = require('./controllers/user-actions.js');

// basic routing
app.get('/', function(req, res){
	res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/about', function (req, res) {
  res.sendFile(path.join(publicDir, 'about.html'));
});

// start server
http.listen(3000, function(){
	console.log('Ashes Online is running on port 3000. Prepare for magical fun times!');
});

//   _____          __  __ ______    ____  ____       _ ______ _____ _______ _____
//  / ____|   /\   |  \/  |  ____|  / __ \|  _ \     | |  ____/ ____|__   __/ ____|
// | |  __   /  \  | \  / | |__    | |  | | |_) |    | | |__ | |       | | | (___
// | | |_ | / /\ \ | |\/| |  __|   | |  | |  _ < _   | |  __|| |       | |  \___ \
// | |__| |/ ____ \| |  | | |____  | |__| | |_) | |__| | |___| |____   | |  ____) |
//  \_____/_/    \_\_|  |_|______|  \____/|____/ \____/|______\_____|  |_| |_____/

// -----------------------------------------------------------[ ]
var Game = require('./models/game.js');
var Player = require('./models/player.js');

// this will hold ALL basic info and states for ALL games currently active
var activeGames = {};


//  _      ____  ____  ______     __
// | |    / __ \|  _ \|  _ \ \   / /
// | |   | |  | | |_) | |_) \ \_/ /
// | |   | |  | |  _ <|  _ < \   /
// | |___| |__| | |_) | |_) | | |
// |______\____/|____/|____/  |_|

// -----------------------------------------------------------[ GET LIST OF GAMES ]
// Get only the basic info from activeGames
// We don't need all the state information for each game
function getGameList() {
	var gameList = {};

	_.each(activeGames, function(game, gameId) {
		gameList[gameId] = _.pick(game, ['gameName', 'gameId', 'status', 'isPrivate', 'allowSpectators', 'maxPlayers']);
	});
	return gameList;
}

// -----------------------------------------------------------[ GET GAME NAME ]
function getGameName(gameId) {
	var players = _.pluck(activeGames[gameId].players, 'username');
	return players.join(' vs. ');
}

// -----------------------------------------------------------[ GET FULL GAME STATE ]
function getGameState(gameId) {
	return activeGames[gameId];
}

// -----------------------------------------------------------[ SEND GAME STATE TO CLIENTS ]
function sendGameState(gameId) {
	console.log('Game ' + gameId + ' state updated.');
	server.to(gameId).emit('gameStateUpdated', getGameState(gameId));
}

// -----------------------------------------------------------[ GET A PLAYER'S USERNAME ]
function getPlayerUsername(gameId, playerSocketId) {
	return activeGames[gameId].players[playerSocketId].username;
}

// -----------------------------------------------------------[ REMOVE PLAYER FROM GAMES ]
// Removes a player from any games they are in
// Deletes the game if their departure makes it empty
function removePlayerFromGames(playerSocketId) {

	console.log('REMOVING A PLAYER FROM A GAME');

	//look through each game
	_.each(activeGames, function(game, gameId) {
		//if they were in this game
		if (game.players[playerSocketId]) {
			//tell everyone they left :(
			chatToGame(gameId, 'server', game.players[playerSocketId].username + ' disconnected.');
			//remove them
			delete(activeGames[gameId].players[playerSocketId]);
			//if the game is now empty, delete it
			if (_.keys(activeGames[gameId].players).length === 0) {
				delete(activeGames[gameId]);
				console.log('Game ' + gameId + ' ended.');
			} else {
				//otherwise send game state
				sendGameState(gameId);
			}
		}
	});
}

// -----------------------------------------------------------[ ADD CHAT TO GAME ]
function chatToGame(gameId, sender, msg) {
	if (activeGames[gameId]) {
		activeGames[gameId].chatLog.push({
			sender: sender,
			message: msg
		});
		//emit an event that alerts the sidebar to scroll to the bottom
		server.to(gameId).emit('chat');
	}
}


//   _____  ____   _____ _  ________ _______ _____
//  / ____|/ __ \ / ____| |/ /  ____|__   __/ ____|
// | (___ | |  | | |    | ' /| |__     | | | (___
//  \___ \| |  | | |    |  < |  __|    | |  \___ \
//  ____) | |__| | |____| . \| |____   | |  ____) |
// |_____/ \____/ \_____|_|\_\______|  |_| |_____/

// -----------------------------------------------------------[ SOCKET CONNECTION ]
server.on('connection', function(socket){

	//send the socket their ID when they connect
	server.to(socket.id).emit('socketId', socket.id);

	// -----------------------------------------------------------[ CLIENT DISCONNECTS ]
	socket.on('disconnect', function () {
		//find out if they were in a game, if so, clean up
		removePlayerFromGames(socket.id);
  });

  // -----------------------------------------------------------[ CLIENT SENDS CHAT ]
	socket.on('chat', function(gameId, sender, msg){
		//add chat to game
		chatToGame(gameId, sender, msg);
		//emit update
		sendGameState(gameId);
	});

	// -----------------------------------------------------------[ CLIENT REQUESTS GAME LIST ]
	socket.on('requestGameList', function(){
		server.emit('gameList', getGameList() );
	});

	// -----------------------------------------------------------[ CLIENT CREATES GAME ]
	socket.on('createGame', function(username){

		var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		var gameId = '';

		//generate a gameId, don't allow duplicates
		do {
			gameId = _.sample(possible, 12).join('');
		} while (activeGames[gameId]);

		//add the user to the game
		socket.join(gameId);

		//create a new game and configure it
		var newGame = new Game();
		newGame.gameId = gameId;
		newGame.gameName = username;
		newGame.players[socket.id] = new Player(username, 1);
		activeGames[gameId] = newGame;

		//send the updated game list to everyone
		server.emit('gameList', getGameList());
		console.log('Game ' + gameId + ' created.');

		//send the game state to this game
		sendGameState(gameId);
	});

	// -----------------------------------------------------------[ CLIENT JOINS GAME ]
	socket.on('joinGame', function(gameId, username){

		//add the user to the game
		socket.join(gameId);

		//add the player to the game
		var playerPosition = _.keys(activeGames[gameId].players).length + 1;
		activeGames[gameId].players[socket.id] = new Player(username, playerPosition);

		//update the name of the game
		activeGames[gameId].gameName = getGameName(gameId);

		//if we have enough players to begin it's go time
		activeGames[gameId] = setup.advanceGameStatusWhenReady(activeGames[gameId]);

		//send the updated game list to everyone
		server.emit('gameList', getGameList());

		//tell the game that someone has joined
		chatToGame(gameId, 'server',  username + ' connected.');

		//send the game state to this game
		sendGameState(gameId);
	});

	// -----------------------------------------------------------[ CLIENT REQUESTS PREBUILT DECKLISTS ]
	socket.on('requestPrebuiltLists', function(gameId){
		server.to(gameId).emit('prebuiltDecklists', lists);
	});

	// -----------------------------------------------------------[ CLIENT SUBMITS DECKLIST ]
	socket.on('submitDecklistForValidation', function(gameId, decklist){
		var validationResults = setup.validateDecklist(decklist, activeGames[gameId], socket.id);
		server.to(gameId).emit('decklistValidated', socket.id, validationResults.decklist, validationResults.valid, validationResults.error);
		sendGameState(gameId);
	});

	// -----------------------------------------------------------[ CLIENT TAKES AN ACTION WE NEED TO HANDLE ]
	socket.on('userAction', function(gameId, action) {

		//handle the action 
		var actionResults = userActions.handleUserAction(activeGames[gameId], action);
		var actionDescription = actionResults.actionDescription;
		activeGames[gameId] = actionResults.game;
		
		//tell everyone what happened if we need to
		if (actionDescription && actionDescription !== '') {
			chatToGame(gameId, 'server', actionDescription);
		}

		//send the updated gamestate
		sendGameState(gameId);

		//if it was a roll, we have to send this after the game state update, 
		//so the animation won't be ended instantly for everyone
		if (action.actionVerb === 'roll') {
			server.to(gameId).emit('dieRoll', action.targetOwnerSocketId, action.target);
		}

	});

});