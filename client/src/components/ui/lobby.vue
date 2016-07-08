<style lang="sass">
.lobby__games {
	background-color:transparentize(black,0.1);
	margin:1rem 0;
	min-height:10rem;
}

.lobby__game-list {
	margin:0;
	padding:0;
	list-style-type: none;
}

.lobby__games-none {
	color:white;
	padding:0.5rem;
	margin:0;
}

.lobby__game {
	color:white;
	padding:0.5rem;

	&.selected {
		background-color:#555;
	}
}
</style>

<template>
<div class="lobby static-page">
	<div class="container">

		<h1>A&nbsp;&middot;&nbsp;S&nbsp;&middot;&nbsp;H&nbsp;&middot;&nbsp;E&nbsp;&middot;&nbsp;S</h1>
		<span class="subheading">ONLINE</span>

		<p>This is a fan project by <a href="https://twitter.com/GregorTerrill">@GregorTerrill</a>.</p>
		<p>I am not associated with <a href="http://www.plaidhatgames.com">Plaid Hat Games</a> in any way. If you like Ashes, please show them your support by <a href="http://www.plaidhatgames.com/store">purchasing their products</a>.</p>
		<p>If you want to learn more about this project, <a href="/about/">click here</a>.</p>
		
		<h2>Lobby</h2>

		<h3>User</h3>

		<label for="username">Enter your name</label>
		<input type="text" id="username" name="username" v-model="username" autocomplete="off" />

		<h3>Available Games ({{ totalGames }})</h3>

		<div class="lobby__games">

		<ul class="lobby__game-list" v-if="totalGames > 0">
			<li v-for="(key, game) in gameList" @click="selectGame(key)" class="lobby__game{{ gameSelected === key ? ' selected' : '' }}">{{ game.gameName }}</li>
		</ul>

		<p class="lobby__games-none" v-else>None</p>

		</div>

		<button class="btn" :disabled="!username" @click="createGame">Create Game</button>
		<button class="btn" :disabled="!readyToJoin" @click="joinGame">Join Game</button>
		<button class="btn" disabled>Spectate Game</button>

	</div>
</div>
</template>

<script>
import store from '../../store.js';

export default {
	data: function() {
		return {
			username: "",
			gameSelected: false
		}
	},

	computed: {
		gameList: function() {
			return store.gameList;
		},
		readyToJoin: function() {
			if (this.username && this.gameSelected) {
				return true;
			}
			return false;
		},
		totalGames: function() {
			if (store.gameList) {
				return Object.keys(store.gameList).length;
			}
			return 0;
		}
	},

	methods: {

		createGame: function() {
			store.socket.emit('createGame', this.username);
			store.username = this.username;
		},

		joinGame: function() {
			store.socket.emit('joinGame', this.gameSelected, this.username);
			store.username = this.username;
			store.state.gameId = this.gameSelected;
		},

		selectGame: function(gameId) {
			this.gameSelected = gameId;
		}

	},

	ready() {
		store.socket.emit('requestGameList');
	}
}
</script>