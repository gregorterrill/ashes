<style lang="sass">
.chat {
	width:100%;
	height:50%;
	margin:auto;
	flex-grow:0;
	position:relative;
}

.chat__messages { 
	list-style-type: none; 
	margin: 0; 
	padding: 0.5rem 0.5rem 2rem;
	height:calc(50vh - 1.5rem);
	overflow-y:scroll;

	li { 
		font-size:0.825rem;
		line-height:1.2;
		color: white;
		padding: 0.125rem 0; 

		&:last-of-type {
			margin-bottom:1rem;
		}

		&.server-msg {
			color:#CCC;
			font-style:italic;
		}
	}
}

.chat__form {
	display:block;
	position: absolute;
  bottom: 0;
  width: 100%;
}

.chat__input, .chat__btn {
	display:inline-block;
	border:none;
	border-top:1px solid white;
	border-bottom:1px solid white;
	background-color:black;
	color:white;
	padding:0.25rem;

	&:focus {
		outline:none;
	}
}

.chat__input {
	width:80%;
}

.chat__btn {
	width:20%;
	border-left:1px solid white;

	&:hover, &:active {
		background-color: white;
		color:black;
		cursor:pointer;
	}
}
</style>

<template>
	<div class="sidebar">
		<div class="actions">
			<p v-if="actions.message">{{ actions.message }}</p>
			<button class="btn" v-for="action in actions.buttons" @click="submitAction(action.action)">{{ action.text }}</button>
		</div>
		<div id="chat" class="chat">
			<ul class="chat__messages" v-el:chat>
				<li v-for="chatLine in chatLog" class="{{ chatLine.sender === 'server' ? 'server-msg' : '' }}">{{ chatLine.sender === 'server' ? '' : chatLine.sender + ': ' }}{{ chatLine.message }}</li>
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
			message: ''
		};
	},

	computed: {
		chatLog: function() {
			return store.state.chatLog
		},
		actions: function() {
			return store.state.players[store.socketId].actions;
		}
	},

	methods: {
		sendChat: function() {
			if (this.message.length) {
				store.socket.emit('chat', store.state.gameId, store.username, this.message);
				this.message = '';
			}
		},
		submitAction: function(actionVerb) {
			//deal with this on the server
			store.socket.emit('userAction', store.state.gameId, {
				playerSocketId: store.socketId,
				actionVerb: actionVerb
			});
		}
	},

	events: {
		chatRecieved: function() {
			//keep scrolled to bottom
			this.$els.chat.scrollTop = this.$els.chat.scrollHeight;
		}
	}
}
</script>