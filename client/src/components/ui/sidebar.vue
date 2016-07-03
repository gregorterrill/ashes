<style lang="sass">
</style>

<template>
	<div class="sidebar">
		<div class="actions">
			<h2>Main Actions</h2>
			<button class="btn">Attack Pheonixborn</button>
			<button class="btn">Attack Unit</button>
			<button class="btn">Pass</button>
			<h2>Side Actions</h2>
			<button class="btn">Meditate</button>
			<button class="btn">Dice Power</button>
			<hr/>
			<button class="btn">End Turn</button>
		</div>
		<div id="chat" class="chat">
			<ul class="chat__messages">
				<li v-for="chatLine in chatLog" :class="chatLine.className">{{ chatLine.sender }}: {{ chatLine.message }}</li>
			</ul>
			<form class="chat__form" action="" @submit.prevent="sendChat">
				<input class="chat__input" id="message" autocomplete="off" v-model="message" /><button class="chat__btn">Send</button>
			</form>
		</div>
	</div>
</template>

<script>
import store from '../../store.js';

export default {

	data: function() {
		return { 
			message: '' ,
			chatLog: store.state.chatLog
		};
	},

	methods: {
		sendChat: function() {
			if (this.message.length) {
				store.socket.emit('chat', store.username, this.message);
				this.message = '';
			}
		}
	},

	events: {
		'chatRecieved': function(message) {
			store.state.chatLog.push(message);
		}
	}
}
</script>