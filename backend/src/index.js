const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: process.env.FRONTEND_URL || 'http://localhost:3000',
		methods: ['GET', 'POST'],
	},
	pingTimeout: 10000,
	pingInterval: 5000,
});

// Strutture dati per gestire gli utenti e le chat
const usersStore = {
	// Mappa dei client attivi: clientId -> { socketId, lastPing }
	activeUsers: new Map(),
	// Mappa delle coppie chat attive: socketId -> partnerSocketId
	chatPairs: new Map(),
};

// Helper function per verificare se un socket è ancora connesso
function isSocketConnected(socketId) {
	const socket = io.sockets.sockets.get(socketId);
	return socket && socket.connected;
}

// Pulizia delle connessioni stale
function cleanupStaleConnections() {
	const now = Date.now();
	for (const [clientId, data] of usersStore.activeUsers.entries()) {
		if (!isSocketConnected(data.socketId) || now - data.lastPing > 15000) {
			console.log(`Cleaning up stale connection for client ${clientId}`);
			cleanupUser(data.socketId);
		}
	}
}

// Calcolo delle statistiche correnti
function getCurrentStats() {
	cleanupStaleConnections();

	// Conta solo i socket effettivamente connessi
	const connectedClients = [...usersStore.activeUsers.values()].filter((data) =>
		isSocketConnected(data.socketId)
	).length;

	// Conta le coppie chat attive dove entrambi gli utenti sono ancora connessi
	const activePairsCount =
		[...usersStore.chatPairs.entries()].filter(
			([id1, id2]) => isSocketConnected(id1) && isSocketConnected(id2)
		).length / 2;

	return {
		total: connectedClients,
		chatting: activePairsCount * 2,
	};
}

// Aggiornamento e broadcast delle statistiche
function broadcastStats() {
	const stats = getCurrentStats();
	io.emit('stats', stats);
	console.log('Current stats:', stats);
}

// Pulizia dei dati utente
function cleanupUser(socketId) {
	// Rimuovi dalle strutture dati
	for (const [clientId, data] of usersStore.activeUsers.entries()) {
		if (data.socketId === socketId) {
			usersStore.activeUsers.delete(clientId);
		}
	}

	if (usersStore.chatPairs.has(socketId)) {
		const partnerId = usersStore.chatPairs.get(socketId);
		if (partnerId) {
			const partnerSocket = io.sockets.sockets.get(partnerId);
			if (partnerSocket) {
				partnerSocket.emit('partnerDisconnected');
			}
			usersStore.chatPairs.delete(partnerId);
		}
		usersStore.chatPairs.delete(socketId);
	}

	broadcastStats();
}

// Gestione delle connessioni
io.on('connection', (socket) => {
	console.log('User connected:', socket.id);

	const clientId = socket.handshake.query.clientId || socket.id;

	// Gestione connessioni duplicate
	for (const [existingClientId, data] of usersStore.activeUsers.entries()) {
		if (existingClientId === clientId && data.socketId !== socket.id) {
			const existingSocket = io.sockets.sockets.get(data.socketId);
			if (existingSocket) {
				console.log(`Disconnecting duplicate connection for client ${clientId}`);
				existingSocket.disconnect();
				cleanupUser(data.socketId);
			}
		}
	}

	// Aggiungi agli utenti attivi
	usersStore.activeUsers.set(clientId, {
		socketId: socket.id,
		lastPing: Date.now(),
	});
	broadcastStats();

	// Gestione ping
	socket.on('ping', () => {
		const userData = usersStore.activeUsers.get(clientId);
		if (userData) {
			userData.lastPing = Date.now();
			usersStore.activeUsers.set(clientId, userData);
		}
	});

	// Gestione ricerca match
	socket.on('findMatch', () => {
		// Aggiorna timestamp ultimo ping
		const userData = usersStore.activeUsers.get(clientId);
		if (userData) {
			userData.lastPing = Date.now();
			usersStore.activeUsers.set(clientId, userData);
		}

		// Pulisci chat precedente se esiste
		if (usersStore.chatPairs.has(socket.id)) {
			const oldPartnerId = usersStore.chatPairs.get(socket.id);
			if (oldPartnerId) {
				const partnerSocket = io.sockets.sockets.get(oldPartnerId);
				if (partnerSocket) {
					partnerSocket.emit('partnerDisconnected');
				}
				usersStore.chatPairs.delete(oldPartnerId);
				usersStore.chatPairs.delete(socket.id);
			}
		}

		// Trova utente disponibile
		const availableUser = [...usersStore.activeUsers.values()].find(
			(data) =>
				isSocketConnected(data.socketId) &&
				data.socketId !== socket.id &&
				!usersStore.chatPairs.has(data.socketId)
		);

		if (availableUser) {
			const partnerId = availableUser.socketId;
			usersStore.chatPairs.set(socket.id, partnerId);
			usersStore.chatPairs.set(partnerId, socket.id);

			socket.emit('matched');
			io.to(partnerId).emit('matched');
		}
		broadcastStats();
	});

	// Gestione messaggi
	socket.on('sendMessage', ({ message }) => {
		const userData = usersStore.activeUsers.get(clientId);
		if (userData) {
			userData.lastPing = Date.now();
			usersStore.activeUsers.set(clientId, userData);
		}

		if (usersStore.chatPairs.has(socket.id)) {
			const partnerId = usersStore.chatPairs.get(socket.id);
			if (partnerId && isSocketConnected(partnerId)) {
				io.to(partnerId).emit('message', {
					text: message,
					sender: socket.id,
				});
			}
		}
	});

	// Gestione typing
	socket.on('typing', (isTyping) => {
    if (usersStore.chatPairs.has(socket.id)) {
        const partnerId = usersStore.chatPairs.get(socket.id);
        if (partnerId && isSocketConnected(partnerId)) {
            io.to(partnerId).emit('partnerTyping', isTyping);
            
            if (isTyping) {
                setTimeout(() => {
                    if (isSocketConnected(partnerId)) {
                        io.to(partnerId).emit('partnerTyping', false);
                    }
                }, 5000);
            }
        }
    }
});

	// Gestione disconnessione
	socket.on('disconnect', () => {
		console.log('User disconnected:', socket.id);
		cleanupUser(socket.id);
	});
});

// Pulizia periodica ogni 10 secondi
setInterval(cleanupStaleConnections, 10000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
