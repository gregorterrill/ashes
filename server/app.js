var express = require('express');
var app = express();
var http = require('http').Server(app);
var server = require('socket.io')(http);
var _ = require('underscore');

var lists = require('./data/decks.json');
var cards = require('./data/cards.json');

app.use(express.static('../client/public'));

app.get('/', function(req, res){
	res.sendFile('../client/public/index.html');
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});

// -----------------------------------------------------------[ GAME OBJECT ]
function Game() {
	this.roomName = 'Empty Room';
	this.roomId = '';
  this.status = 'waiting';
  this.isPrivate = false;
	this.allowSpectators = true;
  this.maxPlayers = 2;
  this.players = []
}

var activeGames = {};

// -----------------------------------------------------------[ HELPERS ]
function removePlayerFromGames(socketId) {

	//look through each game
	_.each(activeGames, function(game, roomId) {

		//find if the players array has a matching socket ID
		var index = _.findIndex(game.players, function(o) { return o.socketId == socketId; });

		//if it does, remove the player
		if (index !== -1 ) {

			//tell everyone they left :(
			var username = activeGames[roomId].players[index].username;
			server.to(roomId).emit('chat', 'SERVER', username + ' disconnected.', 'server-msg');

			//remove them
			activeGames[roomId].players.splice(index,1);

			//if the game is now empty, delete it
			if (game.players.length === 0) {
				delete(activeGames[roomId]);
			}
		}
	});
}

function validateDecklist (decklist) {

	var totalCards = 0;
	var validationResults = {
		valid: true,
		error: '',
		decklist: ''
	};
	var cardBeingChecked;

	try {
		decklist = JSON.parse(decklist);
	} catch (error) {
		validationResults.valid = false;
		validationResults.error = 'Decklist is invalid JSON.';
		return validationResults;
	}

	//add empty conjurations
	decklist.conjurations = {};
	
	//make sure we have a pheonixborn and deck
	if (decklist.deck && decklist.pheonixborn) {

		//check that pheonixborn is valid
		cardBeingChecked = cards[decklist.pheonixborn];

		if (!cardBeingChecked || cardBeingChecked.type != 'pheonixborn') {
			validationResults.valid = false;
			validationResults.error = 'Deck has an invalid Pheonixborn.';
			return validationResults;
		}

		//make sure it has 30 cards and no more of three each
		_.each(decklist.deck, function(quantity, cardName) {

			//check this card against the master card list to make sure its there
			cardBeingChecked = cards[cardName];
			if (!cardBeingChecked) {
				validationResults.valid = false;
				validationResults.error = 'Deck contains an invalid card: \'' + cardName + '\'.';
				return validationResults;
			}

			//check if the card has any character restriction
			if (cardBeingChecked.characterBound && cardBeingChecked.characterBound !== decklist.pheonixborn) {
				validationResults.valid = false;
				validationResults.error = 'Deck has a card that is unique to another Pheonixborn: \'' + cardName + '\'.';
				return validationResults;
			}

			//check if we need to add conjurations for it
			if (cardBeingChecked.conjurations) {
				for (key in cardBeingChecked.conjurations) {
					if (cards[key] && cards[key].type === 'conjuration') {
						decklist.conjurations[key] = cardBeingChecked.conjurations[key];
					} 
				}
			}

			//check quantity of cards in the deck
			quantity = parseInt(quantity);

			if (quantity > 3 ) {
				validationResults.valid = false;
				validationResults.error = 'Deck contains more than 3 copies of a card.';
				return validationResults;
			}
			if (quantity < 1 ) {
				validationResults.valid = false;
				validationResults.error = 'Deck contains fewer than 1 copy of a card.';
				return validationResults;
			}
			totalCards += quantity;

		});

		if (totalCards !== 30) {
			validationResults.valid = false;
			validationResults.error = 'Deck does not contain exactly 30 cards.';
			return validationResults;
		}

	} else {
		validationResults.valid = false;
		validationResults.error = 'Decklist does not contain a deck and/or Pheonixborn.';
		return validationResults;
	}

	//check the dice!
	if (decklist.dice) {

		if (decklist.dice.cha + decklist.dice.ill + decklist.dice.cer + decklist.dice.nat !== 10) {
			validationResults.valid = false;
			validationResults.error = 'Decklist does not contain exactly 10 dice.';
			return validationResults;
		}

	} else {
		validationResults.valid = false;
		validationResults.error = 'Decklist does not contain dice.';
		return validationResults;
	}
	
	//add the modified decklist (w/conjurations added)
	validationResults.decklist = JSON.stringify(decklist);
	return validationResults;
}









// -----------------------------------------------------------[ SOCKET CONNECTION ]
server.on('connection', function(socket){

	//send the socket their ID
	server.to(socket.id).emit('socketId', socket.id);

	// -----------------------------------------------------------[ CLIENT DISCONNECTS ]
	socket.on('disconnect', function () {
		//find out if they were in a game, if so, clean up
		removePlayerFromGames(socket.id);
  });

  // -----------------------------------------------------------[ CLIENT SENDS CHAT ]
	socket.on('chat', function(sender, msg){
		server.emit('chat', sender, msg);
	});

	// -----------------------------------------------------------[ CLIENT REQUESTS GAME LIST ]
	socket.on('requestGameList', function(){
		server.emit('gameList', activeGames );
	});

	// -----------------------------------------------------------[ CLIENT CREATES GAME ]
	socket.on('createGame', function(username){

		var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		var roomId = '';

		//generate a roomId, don't allow duplicates
		do {
			roomId = _.sample(possible, 12).join('');
		} while (activeGames[roomId]);

		//add the user to the room
		socket.join(roomId);

		//create a new game and configure it
		var newGame = new Game();
		newGame.roomId = roomId;
		newGame.roomName = username;
		newGame.players.push({
			socketId: socket.id,
			username: username
		});
		activeGames[roomId] = newGame;

		//send the updated game list
		server.emit('gameList', activeGames );
		server.to(roomId).emit('gamePlayersUpdated', roomId);
	});

	// -----------------------------------------------------------[ CLIENT JOINS GAME ]
	socket.on('joinGame', function(roomId, username){

		//add the user to the room
		socket.join(roomId);

		//add the player to the game
		activeGames[roomId].players.push({
			socketId: socket.id,
			username: username
		});

		//update the name of the game
		activeGames[roomId].roomName += ' vs. ' + username;

		//if we have enough players to begin, update status
		if (activeGames[roomId].players.length === activeGames[roomId].maxPlayers) {
			activeGames[roomId].status = 'ready';
		}

		//send the updated game list
		server.emit('gameList', activeGames );
		server.to(roomId).emit('gamePlayersUpdated', roomId);

		//tell the room that someone has joined
		server.to(roomId).emit('chat', 'SERVER', username + ' connected.', 'server-msg');

	});

	// -----------------------------------------------------------[ CLIENT REQUESTS PREBUILT DECKLISTS ]
	socket.on('requestPrebuiltLists', function(roomId){
		server.to(roomId).emit('prebuiltDecklists', lists);
	});

	// -----------------------------------------------------------[ CLIENT SUBMITS DECKLIST ]
	socket.on('submitDecklistForValidation', function(roomId, decklist){
		var validationResults = validateDecklist(decklist);
		server.to(roomId).emit('decklistValidated', socket.id, validationResults.decklist, validationResults.valid, validationResults.error);
	});



});