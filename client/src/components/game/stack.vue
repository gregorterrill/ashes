<style lang="sass">
.stack {
	display:inline-block;
	vertical-align:top;
	width:100px;
	height:140px;
	position:relative;
	background-size:100px 140px;
	border-radius:6px;
}

.stack--empty {
	background-color:transparentize(black,0.9);
	background-image:none;
}

.stack__hand {
	width: 50px;
  position: relative;
  top: 48px;
  left: 26px;
  opacity:0.85;
}

</style>

<template>
	<div @click.stop="openContext" v-bind:style="{ backgroundImage: 'url(' + this.stackImageUri + ')' }" class="stack stack--face-{{ this.face }} stack--{{ this.type }}{{ !this.cards.length ? ' stack--empty' : ''}}">
		<div class="stack__counter">{{ this.cards.length ? this.cards.length : '0' }}</div>
		<img class="stack__hand" v-if="(this.type === 'hand')" src="img/icon-hand.png" />
	</div>
</template>

<script>
import store from '../../store.js';

export default {
	props: ['type', 'cards', 'face'],
	
	computed: {

		stackImageUri: function() {

			// if the stack is empty, show nothing
			if (this.cards.length === 0) {
				return '';
			}

			//if the stack is face up, show the top card
			if (this.face === 'up') {
				return 'img/cards/' + encodeURIComponent(this.cards[0].name) + '.jpg';
			}

			if (this.type === 'conjurations') {
				return 'img/back-conjuration.jpg';
			}

			return 'img/back-standard.jpg';

		},

		contextActions: function() {

			actions = [];

			var isOwner = (store.socketId === this.$parent.playerId);

			//if i own this deck and there are multiple cards in it, i can shuffle it
			if (isOwner && this.cards.length > 1) {
				actions.push({
					text: "Shuffle",
					action: this.shuffle
				});
			}

			//if this deck is face up or i own it, and there are cards in it, i can look at it
			if ((this.face === 'up' || isOwner) && this.cards.length > 0) {
				actions.push({
					text: "Peek",
					action: this.peekAtCards
				});
			}

			//TODO : For debug only FIRST FIVE draw helper
			if (isOwner && this.type === 'deck' && store.state.status == 'firstFive') {
				actions.push({
					text: "DEBUG: Get five",
					action: function() {
						for (var i = 4; i >= 0; i--) {
							store.socket.emit('userAction', store.state.gameId, {
								playerSocketId: store.socketId,
								actionVerb: 'move',
								object: store.state.players[store.socketId].deck[Math.floor(Math.random() * store.state.players[store.socketId].deck.length)],
								targetType: 'stack',
								target: 'hand',
								targetOwnerSocketId: store.socketId
							});
						}
					}
				});
			}

			return actions;
		}
	},

	methods: {

		openContext: function(e) {
			if (this.contextActions.length) {
				this.$dispatch('openContext', this.contextActions, e );
			}
		},
		
		shuffle: function() {

			this.$dispatch('playSound', 'shuffle');

			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'shuffle',
				target: this.type,
				targetOwnerSocketId: this.$parent.playerId
			});
		},

		peekAtCards: function() {
			this.$dispatch('openBrowser', this.$parent.playerId, this.type );

			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: 'peek',
				target: this.type,
				targetOwnerSocketId: this.$parent.playerId
			});
		}
	}
}
</script>