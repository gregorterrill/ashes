<style lang="sass">
@import 'main.scss';
</style>

<template>

	<lobby v-if="!store.state.gameId"></lobby>

	<div v-if="store.state.gameId" class="game">

		<infobar></infobar>

		<div class="container">

			<div class="boards">
				<board player="opponent"></board>
				<board player="you"></board>
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

//helpers
import { testFunction } from '../helpers/game.js';

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
	}
}
</script>