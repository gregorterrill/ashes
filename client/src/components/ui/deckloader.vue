<style lang="sass">
.deck-loader {
	flex-grow:1;
}

label {
	display:block;
}

#decklist, #prebuilt {
	margin-bottom:1rem;
}

</style>

<template>
	<div class="deck-loader">
		<h2>Deck Loader</h2>

		<div v-if="!decklistValid">
			<label for="prebuilt-{{ player }}">Choose a prebuilt deck</label>
			<select id="prebuilt-{{ player }}" name="prebuilt" v-model="prebuiltSelection" @change="populateDecklist">
				<option value="">Choose...</option>
				<option v-for="(key, list) in prebuiltLists" value="{{ key }}">{{ list.pheonixborn }} - {{ list.name }}</option>
			</select>
			
			<label for="decklist-{{ player }}">Or paste your list here</label>
			<textarea rows="5" name="decklist" id="decklist-{{ player }}" v-model="decklist"></textarea>

			<button class="btn btn--block" @click="submitDecklistForValidation">Submit</button>

			<p class="alert alert--error" v-if="validationError">{{ validationError }} Please re-submit.</p>
		</div>

		<div v-if="decklistValid">
			<p class="alert alert--success">Your decklist is valid and locked in!</p>
		</div>

	</div>
</template>

<script>
import store from '../../store.js';

export default {
	props: ['player'],
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
			} else {
				//TODO - was the validation for my opponent?
				
			}

			//TODO - if all players decklists are now validated, time to start the game!
			store.state.gameRound = 0;

			store.socket.emit('requestGameState', store.state.gameId);
		}
	}
}
</script>