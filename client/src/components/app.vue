<style lang="sass">
@import 'main.scss';

.boards {
	display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
</style>

<template>

	<lobby v-if="!store.state.gameId"></lobby>

	<div v-if="store.state.gameId" class="game">

		<infobar></infobar>

		<div class="container">

			<div class="boards">
				<board v-for="playerId in otherPlayerIds" :player-id="playerId" player-type="opponent"></board>
				<board :player-id="store.socketId" player-type="you"></board>
			</div>

			<sidebar></sidebar>

		</div>

		<audio v-el:sound-dice class="sound sound--dice" src="../../sound/dice.mp3" preload>
		<audio v-el:sound-shuffle class="sound sound--shuffle" src="../../sound/shuffle.mp3" preload>

	</div>

</template>

<script>

// components
import lobby from './ui/lobby.vue';
import board from './game/board.vue';
import sidebar from './ui/sidebar.vue';
import infobar from './ui/infobar.vue';
import store from '../store.js';

export default {
	components: {
		lobby,
		infobar,
		sidebar,
		board
	},
	events: {
		'playSound': function(soundName) {

			var soundEl = this.$els['sound' + soundName.charAt(0).toUpperCase() + soundName.slice(1)];

			soundEl.pause();
			soundEl.currentTime = 0;
			setTimeout(function () {      
			   soundEl.play();
			}, 150);
		}
	},
	data: function() {
		return {
			store: store
		}
	},
	computed: {
		otherPlayerIds: function() {
			var playerIds = [];
			for (var playerId in store.state.players) {
				if (playerId !== store.socketId) {
					playerIds.push(playerId);
				}
			}
			return playerIds;
		}
	}
}
</script>