import pg from "pg"
import { Request, Response } from "express"
import config from "../database"

export const uploadPublicKey = async (req: Request, res: Response) => {
    const { userId, publicKey } = req.body;
    try {
        let dbClient
        dbClient = new pg.Client(config)
        await dbClient.connect()
        await dbClient.query({
            text: "update users set public_key = $2 where id = $1",
            values: [userId, publicKey],
        })
        await dbClient.end()
        res.send({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to store public key' });
    }

};

export const getPublicKey = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        let dbClient
        dbClient = new pg.Client(config)
        await dbClient.connect()
        const row = await dbClient.query({
            text: "select public_key from users where id = $1",
            values: [userId],
        })
        await dbClient.end()
        if (!row?.rows?.[0]) return res.status(404).json({ error: 'Key not found' });
        res.send({ publicKey: row?.rows?.[0]?.public_key });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching public key' });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
    const { senderId, receiverId, message, nonce } = req.body;
    try {
        let dbClient
        dbClient = new pg.Client(config)
        await dbClient.connect()
        await dbClient.query({
            text: "insert into messages (sender_id, receiver_id, message, nonce) values ($1, $2, $3, $4)",
            values: [senderId, receiverId, message, nonce],
        })
        await dbClient.end()
        res.send({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to store message' });
    }
};

export const getHistory = async (req: Request, res: Response) => {
    const { userId, withUser } = req.query;
    if(!userId || !withUser){
        console.log("🚀 ~ getHistory ~ userId, withUser:", userId, withUser)
        return res.status(400).json({ error: 'User ID and With User are required' });
    }
    try {
        let dbClient
        dbClient = new pg.Client(config)
        await dbClient.connect()
        const msgs = await dbClient.query({
            text: "select * from messages where (sender_id = $1 and receiver_id = $2) or (sender_id = $2 and receiver_id = $1)",
            values: [userId, withUser],
        })
        await dbClient.end()
        res.send(msgs?.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};


export const getFriends = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;  
      const dbClient = new pg.Client(config);
      await dbClient.connect();
  
      const friends = await dbClient.query({
        text: `
          SELECT
            u.id AS "friendId",
            u."firstName",
            u."lastName",
            u."profilePicture",
            m.message AS "lastMessage",
            m.nonce AS "nonce",
            m.sent_at AS "lastMessageTime"
          FROM friends f
          JOIN users u ON u.id = f.friend_id
          LEFT JOIN LATERAL (
            SELECT message, nonce, sent_at
            FROM messages
            WHERE 
              (sender_id = f.user_id AND receiver_id = f.friend_id)
              OR
              (sender_id = f.friend_id AND receiver_id = f.user_id)
            ORDER BY sent_at DESC
            LIMIT 1
          ) m ON TRUE
          WHERE f.user_id = $1
          ORDER BY m.sent_at DESC NULLS LAST;
        `,
        values: [userId],
      });
  
      await dbClient.end();
  
      res.send(friends.rows);
    } catch (err) {
      console.error("❌ Error fetching friends:", err);
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  };