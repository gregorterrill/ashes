<style lang="sass">
.deck-loader {
	flex-grow:1;

	.select-container, .decklist-container {
		margin-bottom:1rem;
	}
}

.decklist-container label {
	display:inline;
}

#decklist, #prebuilt {
	margin-bottom:1rem;
}

</style>

<template>
	<div v-if="(playerType === 'you')" class="deck-loader">

		<div v-if="!decklistValid">
			<label for="prebuilt-{{ playerId }}">Choose a prebuilt deck</label>

			<div class="select-container">
				<select id="prebuilt-{{ playerId }}" name="prebuilt" v-model="prebuiltSelection" @change="populateDecklist">
					<option value="">Choose...</option>
					<option v-for="(key, list) in prebuiltLists" value="{{ key }}">{{ list.pheonixborn }} - {{ list.name }}</option>
				</select>
				<span class="icon">&blacktriangledown;</span>
			</div>
			
			<div class="decklist-container">
				<label for="decklist-{{ playerId }}">Or paste your decklist here</label> <a href="/about/#formatting" target="_blank">(formatting help)</a>
				<textarea rows="5" name="decklist" id="decklist-{{ playerId }}" v-model="decklist"></textarea>
			</div>

			<button class="btn btn--block" @click="submitDecklistForValidation">Submit</button>

			<p class="alert alert--error" v-if="validationError">{{ validationError }} Please re-submit.</p>
		</div>

		<div v-if="decklistValid">
			<p class="alert alert--success">Your decklist is valid and locked in! Waiting for opponents.</p>
		</div>

	</div>
	<div v-else>
		<p class="alert alert--success">Your opponent is choosing their deck.</p>
	</div>
</template>

<script>
import store from '../../store.js';

export default {
	props: ['player-type', 'player-id'],
	data: function() {
		return {
			prebuiltLists: {},
			prebuiltSelection: '',
			decklist: '',
			decklistValid: false,
			validationError: ''
		}
	},

	ready() {
		store.socket.emit('requestPrebuiltLists', store.state.gameId);
	},

	methods: {

		populateDecklist: function() {
			this.decklist = JSON.stringify(this.prebuiltLists[this.prebuiltSelection]);
		},

		submitDecklistForValidation: function() {
			store.socket.emit('submitDecklistForValidation', store.state.gameId, this.decklist);
		}
		
	},

	events: {
		prebuiltDecklists: function(lists) {
			this.prebuiltLists = lists;
		},

		decklistValidated: function(playerSocketId, decklist, valid, validationError) {
			//if this is for us
			if (playerSocketId === store.socketId) {
				this.decklistValid = valid;
				this.decklist = decklist;

				if (validationError) {
					this.validationError = validationError;
				} else if (!valid) {
					this.validationError = 'Unspecified validation error.';
				}
			}
		}
	}
}
</script>