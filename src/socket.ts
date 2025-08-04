// socket.ts
import { Server, Socket } from 'socket.io';
import config from './database';
import pg from 'pg';

let io: Server;
const onlineUsers = new Map<string, string>();

interface MessagePayload {
  senderId: string;
  receiverId: string;
  message: string;
  nonce: string;
}

function initSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log('✅ Socket connected:', socket.id);

    socket.on('register', (userId: string) => {
      onlineUsers.set(userId, socket.id);
      console.log(`👤 User ${userId} is online with socket ${socket.id}`);
    });

    socket.on('send-message', async ({ senderId, receiverId, message, nonce }: MessagePayload) => {
      console.log(`📨 Encrypted message from ${senderId} to ${receiverId}`);

      let dbClient
      try {
        dbClient = new pg.Client(config)
        await dbClient.connect();

        const result = await dbClient.query(
          'SELECT public_key FROM users WHERE id = $1',
          [senderId]
        );
        await dbClient.end()

        if (result.rowCount === 0) {
          console.warn(`⚠️ No public key found for sender ${senderId}`);
          return;
        }

        const senderPublicKey = result.rows[0].public_key;

        dbClient = new pg.Client(config)
        await dbClient.connect()

        await dbClient.query(
          'INSERT INTO messages (sender_id, receiver_id, message, nonce) VALUES ($1, $2, $3, $4)',
          [senderId, receiverId, message, nonce]
        );

        await dbClient.end();

        const receiverSocketId = onlineUsers.get(receiverId);
        console.log("🚀 ~ initSocket ~ receiverSocketId:", receiverSocketId)
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive-message', {
            senderId,
            message,
            nonce,
            senderPublicKey,
          });
          console.log(`📤 Message sent to ${receiverId}`);
        } else {
          console.log(`📴 Receiver ${receiverId} is offline`);
        }
      } catch (err) {
        console.error('❌ send-message failed:', (err as Error).message);
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, sId] of onlineUsers.entries()) {
        if (sId === socket.id) {
          onlineUsers.delete(userId);
          console.log(`👋 User ${userId} disconnected`);
          break;
        }
      }
    });
  });
}

export default { initSocket };
