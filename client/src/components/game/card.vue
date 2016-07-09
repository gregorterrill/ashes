<style lang="sass">
.card {
	display:inline-block;
	vertical-align:top;
	width:100px;
	height:140px;
	position:relative;
	background-image:url('../img/back-standard.jpg');
	background-size:100px 140px;
	border-radius:6px;
}
</style>

<template>
	<div @click.stop="openContext" class="card" :style="{ backgroundImage: 'url(' + imageUri + ')' }" @mouseover="previewCard" ></div>
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

		contextActions: function() {

			actions = [];

			var isController = (store.socketId === this.cardData.controller);

			//if i control this card, i can do what i want with it
			if (isController) {
				actions.push({
					text: "Activate",
					action: this.activateCard
				});

				//decide valid moveTo locations based on card type / location / current location
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

				if (moveLocations.length >= 1) {
					actions.push({
						text: "Move to...",
						action: this.doSubAction,
						subActions: moveLocations
					});
				}
			}

			return actions;
		},

		imageUri : function() {
			//TODO: breaks when name has single quote, like Rin's Fury
			return 'img/cards/' + encodeURIComponent(this.cardData.name) + '.jpg';
		}
	},
	methods: {
		previewCard: function(e) {
			this.$dispatch('previewCard', this.imageUri, e );
			// TODO: nothing is catching this yet
		},

		openContext: function(e) {
			if (this.contextActions.length) {
				this.$dispatch('openContext', this.contextActions, e );
			}
		},

		doSubAction: function() {
			console.log('should be doing a sub action instead');
		},

		moveToHand: function() {

			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				target: 'hand',
				targetOwnerSocketId: store.socketId
			});

		},

		moveToDeck: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				target: 'deck',
				targetOwnerSocketId: store.socketId
			});
		},

		moveToConjurations: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				target: 'conjurations',
				targetOwnerSocketId: store.socketId
			});
		},

		moveToDiscard: function() {
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'move',
				object: this.cardData,
				target: 'discard',
				targetOwnerSocketId: store.socketId
			});
		},

		moveToSpellboard: function() {
			console.log('tried to move to spellboard but failed');
		},

		moveToBattlefield: function() {
			console.log('tried to move to battlefield but failed');
		},

		moveToUnit: function() {
			console.log('tried to move to unit but failed');
		},

		activateCard: function() {
			console.log('tried to activate a card but failed');
		}
	}
}
</script>