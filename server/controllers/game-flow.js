/**
 * GAME FLOW
 * 1.Prepare Phase
 * - Increment the game round
 * - Roll dice in exhausted pool and refresh them
 * - Discard any cards from hand
 * - Draw back to 5, doing damage if necessary
 * 2.Player Turns Phase
 * - Alternate taking turns until both players pass in a row
 * 3.Recovery Phase
 * - Units remove wounds equal to recover value
 * - Remove 1 exhaustion from each card
 * - Exhaust any active dice desired
 * - Pass first player token to next player
 */

var _ = require('underscore');
var utils = require('../helpers/utils.js');
var userActions = require('./user-actions.js');

function startPhase(game) {

	switch (game.status) {

		case 'preparePhase':
			//increase the round counter, re-roll and refresh all dice, determine first player if first round
			game = preparePhaseAutoActions(game);

			//send the actions
			game = userActions.updatePlayerActions(game, 'preparePhase');
			break;

		case 'playerTurnsPhase':
			//send the actions
			game = userActions.updatePlayerActions(game, 'playerTurnsPhase');
			break;

		case 'recoveryPhase':
			//recover all units with recovery values, remove one exhaustion token from each card, pass first player marker
			game = recoveryPhaseAutoActions(game);

			//send the actions
			game = userActions.updatePlayerActions(game, 'recoveryPhase');
			break;
	}	

	return game;
}

//advance the phase and start the next phase
function advancePhase(game) {

	switch (game.status) {

		case 'preparePhase':
			game.status = 'playerTurnsPhase';
			break;

		case 'playerTurnsPhase':
			game.status = 'recoveryPhase';
			break;

		case 'recoveryPhase':
		default:
			game.status = 'preparePhase';
			game.gameRound++;
			break;
	}

	game = startPhase(game);

	return game;
}

function preparePhaseAutoActions(game) {

	var lastPlayersBasics = false;

	//for each player...
	_.each(game.players, function(playerData, playerSocketId) {

		var numBasics = 0;

		//and each of their dice...
		_.each(game.players[playerSocketId].dice, function(dieData, index) {

			//if it's exhausted, refresh it and re-roll it
			if (dieData.exhausted) {
				var newFace = utils.getDieRoll();
				game.players[playerSocketId].dice[index].face = newFace;
				game.players[playerSocketId].dice[index].exhausted = false;

				if (newFace === 'basic') {
					numBasics++;
				}
			}

		});

		//if this is the first round, we need to determine first player based on number of rolled basics
		if (game.gameRound === 1) {

			//if there is a tie, both players need to re-roll
			if (numBasics === lastPlayersBasics) {
				//TODO: re-roll without being recursive, probably need to break first player determination into own function
			}

			//if this is the first player we've looked at, or they have more basics than the previous, they're the new start player
			if (!lastPlayersBasics || numBasics > lastPlayersBasics) {
				game = utils.setFirstPlayer(game, playerSocketId);
			}
			lastPlayersBasics = numBasics;
		}

	});

	return game;
}

// Roll and refresh all dice and determine start player
function recoveryPhaseAutoActions(game) {
	//TODO: go through each unit and check for a recover value, if they have damage, remove that many tokens
	//TODO: remove one exhaustion token from each card
	
	//STEP 4: pass the first player to next in position
	//get the current first player's position
	var firstPlayerPosition = game.players[utils.getFirstPlayer(game)].position;

	//try to get the next position's socketId
	var newFirstPlayerSocketId = _.findKey(game.players, { 'position': (firstPlayerPosition + 1) });

	//if there wasn't one, that player was the last, so cycle back to the first position
	if (!newFirstPlayerSocketId) {
		newFirstPlayerSocketId = _.findKey(game.players, { 'position': 1 });
	}

	//set our new first player
	game = utils.setFirstPlayer(game, newFirstPlayerSocketId);

	return game;
}

// -----------------------------------------------------------[ EXPORTS ]
module.exports.advancePhase = advancePhase;