<style lang="sass">
.card {
	display:inline-block;
	vertical-align:top;
	width:100px;
	height:140px;
	position:relative;
	background-image:url('../img/back-standard.jpg');
	background-position:center center;
	background-repeat:no-repeat;
	background-size:100px 140px;
	border-radius:6px;
	text-align:center;
	padding-top:20px;
	border:2px solid transparent;
}

.card__token {
	width:32px;
	height:32px;
	display:inline-block;
	color:white;
	text-align:center;
	line-height:32px;
	background-image:url('../img/token-wound.png');
	background-size: cover;
	text-shadow: 1px 1px 2px black, 1px -1px 2px black, -1px -1px 2px black, -1px 1px 2px black;
}

.card__token--status {
	background-image:url('../img/token-status.png');
}

.card__token--exhaustion {
	background-image:url('../img/token-exhaust.png');
}

</style>

<template>
	<div @click.stop="openContext" class="card{{ isSelected ? ' selected': '' }}" :style="{ backgroundImage: 'url(' + imageUri + ')' }" @mouseover="turnPreviewOn" @mouseleave="turnPreviewOff" >
		<div v-show="(cardData.tokens.wound >= 1)" class="card__token card__token--wound">{{ cardData.tokens.wound }}</div>
		<div v-show="(cardData.tokens.status >= 1)" class="card__token card__token--status">{{ cardData.tokens.status }}</div>
		<div v-show="(cardData.tokens.exhaustion >= 1)" class="card__token card__token--exhaustion">{{ cardData.tokens.exhaustion }}</div>
	</div>
</template>

<script>
import store from '../../store.js';

export default {
	props: ['card-data'],
	data: function() {
		return {

		}
	},
	computed: {

		isSelected: function() {

			//TODO
			return false;

		},

		contextActions: function() {

			actions = [];

			var isController = (store.socketId === this.cardData.controller);

			//if i control this card, i can do what i want with it
			if (isController) {
				actions.push({
					text: "Activate",
					action: this.activateCard
				});

				//decide valid move locations based on card type / location / current location
				if (this.cardData.type !== 'pheonixborn') {

					var moveLocations = [];

					if (this.cardData.currentLocation.name !== 'hand') {
						moveLocations.push({
							text: "Hand",
							action: this.moveToHand
						});
					}

					if (this.cardData.type === 'conjuration') {
						if (this.cardData.currentLocation.name !== 'conjurations') {
							moveLocations.push({
								text: "Conjurations",
								action: this.moveToConjurations
							});
						}
					} else {
						if (this.cardData.currentLocation.name !== 'deck') {
							moveLocations.push({
								text: "Deck",
								action: this.moveToDeck
							});
						}
						if (this.cardData.currentLocation.name !== 'discard') {
							moveLocations.push({
								text: "Discard",
								action: this.moveToDiscard
							});
						}
					}

					if (this.cardData.location === 'battlefield' && this.cardData.currentLocation.name !== 'battlefield') {
						moveLocations.push({
							text: "Battlefield",
							action: this.moveToBattlefield
						});
					}

					if (this.cardData.location === 'spellboard' && this.cardData.currentLocation.name !== 'spellboard') {
						moveLocations.push({
							text: "Spellboard",
							action: this.moveToSpellboard
						});
					}

					if (this.cardData.location === 'unit' && this.cardData.currentLocation.name !== 'unit') {
						moveLocations.push({
							text: "Unit",
							action: this.moveToUnit
						});
					}

					if (moveLocations.length > 0) {
						actions.push({
							text: "Move to...",
							action: this.doSubAction,
							subActions: moveLocations
						});
					}
				}

				//add and remove tokens
				if (this.cardData.type === 'pheonixborn' || 
						this.cardData.currentLocation.name === 'spellboard' || 
						this.cardData.currentLocation.name === 'battlefield' || 
						this.cardData.currentLocation.name === 'unit') {

					//you can always add tokens
					actions.push({
						text: "Add token...",
						action: this.doSubAction,
						subActions: [{
							text: "Wound",
							action: this.addTokenWound
						}, {
							text: "Status",
							action: this.addTokenStatus
						}, {
							text: "Exhaustion",
							action: this.addTokenExhaustion
						}]
					});

					//but you can only remove tokens that exist on the card
					var tokensForRemoval = []; 

					if (this.cardData.tokens.wound > 0) {
						tokensForRemoval.push({
							text: "Wound",
							action: this.removeTokenWound
						});
					}

					if (this.cardData.tokens.status > 0) {
						tokensForRemoval.push({
							text: "Status",
							action: this.removeTokenStatus
						});
					}

					if (this.cardData.tokens.exhaustion > 0) {
						tokensForRemoval.push({
							text: "Exhaustion",
							action: this.removeTokenExhaustion
						});
					}

					if (tokensForRemoval.length > 0) {
						actions.push({
							text: "Remove tokens...",
							action: this.doSubAction,
							subActions: tokensForRemoval
						});
					}
				}

				//TODO: other actions here
			}

			return actions;
		},

		imageUri : function() {

			//encode special chars AND single quotes (so cards like Rin's Fury don't get broken URLs)
			var cardName = encodeURIComponent(this.cardData.name);
			cardName = cardName.replace(/'/g, "%27");

			//TODO: breaks when name has single quote, like Rin's Fury
			return 'img/cards/' + cardName + '.jpg';
		}
	},
	methods: {
		turnPreviewOn: function(e) {
			this.$dispatch('turnPreviewOn', this.imageUri, e );
		},

		turnPreviewOff: function(e) {
			this.$dispatch('turnPreviewOff', e );
		},

		openContext: function(e) {
			if (this.contextActions.length) {
				this.$dispatch('openContext', this.contextActions, e );
			}
		},

		doSubAction: function() {
			console.log('Should be doing a sub-action instead but something went wrong.');
		},

		moveToHand: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				targetType: 'stack',
				target: 'hand',
				targetOwnerSocketId: store.socketId
			});

		},

		moveToDeck: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				targetType: 'stack',
				target: 'deck',
				targetOwnerSocketId: store.socketId
			});
		},

		moveToConjurations: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				targetType: 'stack',
				target: 'conjurations',
				targetOwnerSocketId: store.socketId
			});
		},

		moveToDiscard: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				targetType: 'stack',
				target: 'discard',
				targetOwnerSocketId: store.socketId
			});
		},

		moveToSpellboard: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				targetType: 'zone',
				target: 'spellboard',
				targetOwnerSocketId: store.socketId
			});
		},

		moveToBattlefield: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				targetType: 'zone',
				target: 'battlefield',
				targetOwnerSocketId: store.socketId
			});
		},

		moveToUnit: function() {
			console.log('tried to move to unit but failed');
		},

		addTokenWound: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'addToken',
				object: 'wound',
				targetType: 'card',
				target: this.cardData,
				targetOwnerSocketId: store.socketId
			});
		},

		addTokenStatus: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'addToken',
				object: 'status',
				targetType: 'card',
				target: this.cardData,
				targetOwnerSocketId: store.socketId
			});
		},

		addTokenExhaustion: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'addToken',
				object: 'exhaustion',
				targetType: 'card',
				target: this.cardData,
				targetOwnerSocketId: store.socketId
			});
		},

		removeTokenWound: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'removeToken',
				object: 'wound',
				targetType: 'card',
				target: this.cardData,
				targetOwnerSocketId: store.socketId
			});
		},

		removeTokenStatus: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'removeToken',
				object: 'status',
				targetType: 'card',
				target: this.cardData,
				targetOwnerSocketId: store.socketId
			});
		},

		removeTokenExhaustion: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'removeToken',
				object: 'exhaustion',
				targetType: 'card',
				target: this.cardData,
				targetOwnerSocketId: store.socketId
			});
		},

		activateCard: function() {
			console.log('tried to activate a card but failed');
		}
	}
}
</script>