<style lang="sass">
.infobar {
	height:2rem;
	background-color:black;
	color:white;
	padding: 0.375rem 1.5rem;
	display:flex;
	justify-content: space-between;
}

.infobar__title {
	font-size:1rem;
	font-weight:normal;
	margin:0 auto;
	text-align:center;
}

.infobar__round {
	text-align:right;
}
</style>

<template>
	<div class="infobar">
		<div class="infobar__playerlist">
			<span v-if="playerList[0]">{{ playerList[0].username }}</span>
			<span v-if="playerList[1]"> vs. {{ playerList[1].username }}</span>
			<span v-else> waiting for opponent</span>
		</div>
		<h1 class="infobar__title">A&nbsp;&middot;&nbsp;S&nbsp;&middot;&nbsp;H&nbsp;&middot;&nbsp;E&nbsp;&middot;&nbsp;S</h1>
		<div class="infobar__round">{{ (gameRound > 0) ? 'Round ' + gameRound : 'Setup' }}</div>
	</div>
</template>

<script>
import store from '../../store.js';

export default {
	data: function() {
		return {
			
		}
	},

	computed: {
		gameRound: function() {
			return store.state.gameRound;
		},
		playerList: function() {
			return store.gameList[store.state.gameId].players;
		}
	}
}
</script>