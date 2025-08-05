import pg from "pg"
import { Request, Response } from "express"
import config from "../database"

export const uploadKeys = async (req: Request, res: Response) => {
    const { userId, publicKey, privateKey } = req.body;
    console.log("🚀 ~ uploadKeys ~ encryptedPrivateKey:", privateKey)
    let dbClient
    try {
        dbClient = new pg.Client(config)
        await dbClient.connect()
        await dbClient.query({
            text: `insert into "userKeys" ("publicKey", "encryptedPrivateKey", "userId") values ($1, $2, $3) on conflict ("userId") do update set "publicKey" = $1, "encryptedPrivateKey" = $2, "updatedAt" = now()`,
            values: [publicKey, privateKey, userId],
        })
        await dbClient.end()
        res.send({ success: true });
    } catch (err) {
        console.log("🚀 ~ uploadKeys ~ err:", err)
        res.status(500).json({ error: 'Failed to store public key' });
    }
    finally {
        await dbClient?.end()
    }
};

export const getUserKeys = async (req: Request, res: Response) => {
    const { userId } = req.params;
    let dbClient
    try {
        dbClient = new pg.Client(config)
        await dbClient.connect()
        const row = await dbClient.query({
            text: `select "publicKey", "encryptedPrivateKey", "userPassphrases"."cipherText", "userPassphrases"."iv" from "userKeys" left join "userPassphrases" on "userKeys"."userId" = "userPassphrases"."userId" where "userKeys"."userId" = $1`,
            values: [userId],
        })
        await dbClient.end()
        if (!row?.rows?.[0]) return res.status(404).json({ error: 'Key not found' });
        res.status(200).send({ publicKey: row?.rows?.[0]?.publicKey, encryptedPrivateKey: row?.rows?.[0]?.encryptedPrivateKey, cipherText: row?.rows?.[0]?.cipherText, iv: row?.rows?.[0]?.iv });
    } catch (err) {
        console.log("🚀 ~ getUserKeys ~ err:", err)
        res.status(500).json({ error: 'Error fetching public key' });
    }
    finally {
        await dbClient?.end()
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
    if (!userId || !withUser) {
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


export const uploadPassphrase = async (req: Request, res: Response) => {
    const { userId, cipherText, iv } = req.body;
    console.log("🚀 ~ uploadPassphrase ~ userId, cypherText, iv:", userId, cipherText, iv)
    let dbClient
    try {
        dbClient = new pg.Client(config)
        await dbClient.connect()
        await dbClient.query({
            text: `insert into "userPassphrases" ("cipherText", "iv", "userId") values ($1, $2, $3) on conflict ("userId") do update set "cipherText" = $1, "iv" = $2, "updatedAt" = now()`,
            values: [cipherText, iv, userId],
        })
        await dbClient.end()
        res.status(200).json({ success: true });
    } catch (err) {
        console.log("🚀 ~ uploadPassphrase ~ err:", err)
        res.status(500).json({ error: 'Failed to store passphrase' });
    }
    finally {
        await dbClient?.end()
    }
}

export const getPassphrase = async (req: Request, res: Response) => {
    const { userId } = req.params;
    let dbClient
    try {
        dbClient = new pg.Client(config)
        await dbClient.connect()
        const row = await dbClient.query({
            text: `select "cypherText", "iv" from "userPassphrases" where "userId" = $1`,
            values: [userId],
        })
        if (!row?.rows?.[0]) return res.status(404).json({ error: 'Passphrase not found' });
        res.status(200).json({ cypherText: row?.rows?.[0]?.cypherText, iv: row?.rows?.[0]?.iv });
    } catch (err) {
        console.log("🚀 ~ getPassphrase ~ err:", err)
        res.status(500).json({ error: 'Error fetching passphrase' });
    }
    finally {
        await dbClient?.end()
    }
}