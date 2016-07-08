<style lang="sass">
.stack {
	display:inline-block;
	vertical-align:top;
	width:100px;
	height:136px;
	position:relative;
	background-image:url('../img/back-standard.jpg');
	background-size:100px 136px;
}

.stack--conjurations {
	background-image:url('../img/back-conjuration.jpg');
}

.stack--empty {
	background-image:none;
}

.stack__hand {
	width: 50px;
  position: relative;
  top: 40px;
  left: 26px;
}

</style>

<template>
	<div @click.stop="openContext" class="stack stack--{{ this.type }}{{ !this.cards.length ? ' stack--empty' : ''}}">
		<div class="stack__counter">{{ this.cards.length ? this.cards.length : '0' }}</div>
		<img class="stack__hand" v-if="(this.type === 'hand')" src="img/icon-hand.png" />
	</div>
</template>

<script>
import store from '../../store.js';

export default {
	props: ['type', 'cards'],
	data: function() {
		return {
			contextActions: [ {
				text: "Shuffle",
				action: this.shuffle
			}, {
				text: "Peek",
				action: this.peekAtCards
			} ]
		}
	},
	methods: {

		openContext: function(e) {
			this.$dispatch('openContext', this.contextActions, e );
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
			this.$dispatch('openBrowser', this.cards);

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