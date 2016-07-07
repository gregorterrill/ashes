<style lang="sass">
.die {
	position:relative;
	width:29px;
	height:29px;
	display:inline-block;
	margin-right: 2px;

	&.die--exhausted::after {
		content: "";
		display:block;
		position:absolute;
		top:0;right:0;bottom:0;left:0;
		border-radius:2px;
		background-color:transparentize(black,0.4);
	}

	&.die--rolling {
		animation: diceRoll 0.25s infinite linear;
	}
}

.die--illbasic { background-image:url('../img/dice/illbasic.jpg'); }
.die--illclass { background-image:url('../img/dice/illclass.jpg'); }
.die--illpower { background-image:url('../img/dice/illpower.jpg'); }
.die--natbasic { background-image:url('../img/dice/natbasic.jpg'); }
.die--natclass { background-image:url('../img/dice/natclass.jpg'); }
.die--natpower { background-image:url('../img/dice/natpower.jpg'); }
.die--chabasic { background-image:url('../img/dice/chabasic.jpg'); }
.die--chaclass { background-image:url('../img/dice/chaclass.jpg'); }
.die--chapower { background-image:url('../img/dice/chapower.jpg'); }
.die--cerbasic { background-image:url('../img/dice/cerbasic.jpg'); }
.die--cerclass { background-image:url('../img/dice/cerclass.jpg'); }
.die--cerpower { background-image:url('../img/dice/cerpower.jpg'); }

@keyframes diceRoll {
  0%   { top: 0; }
  25%	 { top: -0.75rem; transform: rotate(90deg); }
  50%	 { top: -0.25rem; transform: rotate(180deg); }
  75%	 { top: 0; transform: rotate(270deg); }
  100% { top: 0; transform: rotate(359deg); }
}

</style>

<template>
	<div @click.stop="openContext" class="die die--{{ type }}{{ face }}{{ exhausted ? ' die--exhausted' : ''}}{{ rolling ? ' die--rolling' : '' }}"></div>
</template>

<script>

export default {
	props: ['type','face','exhausted'],
	data: function() {
		return {
			faces: ['basic','basic','class','class','class','power'],
			rolling: false,
			contextActions: [ {
				text: "Roll",
				action: this.roll
			}, {
				text: "Refresh",
				action: this.refresh
			}, {
				text: "Exhaust",
				action: this.exhaust
			} ]
		}
	},
	methods: {
		roll: function() {
			this.rolling = true;
			this.$dispatch('playSound', 'dice');

			setTimeout(function() {
				this.face = this.faces[Math.floor(Math.random() * this.faces.length)];
				//TODO: send the roll to the server (or maybe do it there?)
				//store.socket.emit('userAction', store.state.gameId, store.socketId, 'rolled', this.type, this.$parent.playerId);
				this.rolling = false;
			}.bind(this), 250);
			
		},
		refresh: function() {
			this.exhausted = false;
		},
		exhaust: function() {
			this.exhausted = true;
		},
		openContext: function(e) {
			this.$dispatch('openContext', this.contextActions, e );
		}
	}
}
</script>