import { Database, type RowDataPacket } from "@zombie/database";
import {
	type SubscribeErrorMessage,
	type SubscribeMessage,
	type WatchErrorMessage,
	type WatchMessage,
	type LikeMessage,
	type LoginFailMessage,
	type LoginSuccessMessage,
	type CommentMessage,
	type ChangePasswordErrorMessage,
	type CancelWorkMessage,
	type ChangePasswordMessage,
	type Message,
	type Work,
	TASK_TYPE,
	type ZombieInfo,
	type WatchTaskData,
	type SubscribeTaskData,
	type ShareLinkMessage,
} from "@zombie/interfaces";
import { parseProxyIp } from "@zombie/utils";

export class Repository {
	private db = Database.getInstance();

	constructor() {}

	async connect() {
		await this.db.connect();
	}

	async fetchSubscrbeTaskData(macroId: number) {
		const sql = `
		SELECT 
                    	zv.id AS zid,
                    	zv.email,
                    	zv.password,
                    	zv.ip,
                    	zv.recovery,
                    	c.id  as cid,
                    	c.handle,
                    	c.name,
                    	c.link
                FROM (
			SELECT 
				*  
			FROM 
				zombies_view 
			WHERE 
				id % 9 = ? 
		) AS zv 
                CROSS JOIN (
			SELECT 
				* 
			FROM 
				channel AS c  
		) AS c
                LEFT JOIN 
			zombies_subscribe AS zs  
                ON 
			zs.zombie_id  = zv.id 
			AND c.id = zs.channel_id 
                WHERE 
			zs.id IS NULL
			AND c.link IS NOT NULL
                ORDER BY 
			RAND()
                LIMIT 
			10
		`;

		const result = await this.db.execute<RowDataPacket[]>(sql, [macroId]);
		return result.map((v) => ({
			zombie: {
				email: v.email,
				password: v.password,
				id: v.zid,
				proxy: parseProxyIp(v.ip),
				recovery: v.recovery,
			},
			task: {
				taskType: TASK_TYPE.SUBSCRIBE,
				channelId: v.cid,
				channelHandle: v.handle,
				subLink: v.link,
			},
		})) as { zombie: ZombieInfo; task: SubscribeTaskData }[];
	}

	async fetchWatchData(zid: number) {
		const sql = `
		SELECT 
			v.* 
		FROM(
			SELECT 
				* 
			FROM 
				zombies_view  
			WHERE 
				id = ?
		) AS z
		CROSS JOIN (
			SELECT
				v.id AS citubeId,
				v.channel_id AS cid,
				v.yt_video_id  AS youtubeId,
				v.video_type AS videoType,
				c.eng AS category,
				v.link
			FROM 
				videos AS v
			JOIN (
				SELECT 
					a.id, 
					ct.eng 
				FROM 
					accounts AS a 
				INNER JOIN 
					categories AS ct 
				ON 
					a.category_id = ct.id
			) AS c
			ON 
				c.id = v.channel_id
			WHERE 
				v.status = 'published'
				AND v.video_type = 'long'
					
		)AS v
		LEFT JOIN 
			zombies_hit AS zh 
		ON 
			zh.video_id  = v.citubeId 
			AND zh.zombie_id  = z.id
		WHERE 
			zh.id IS NULL 
			AND v.link IS NOT NULL
		ORDER BY 
			RAND()
		LIMIT 5`;

		const result = await this.db.execute<RowDataPacket[]>(sql, [zid]);

		const watchDatas = result.map((v) => ({
			taskType: TASK_TYPE.WATCH,
			...v,
		}));

		return watchDatas as WatchTaskData[];
	}


	async fetchWatchData34(zid: number) {
		const sql = `
		SELECT 
			v.* 
		FROM(
			SELECT 
				* 
			FROM 
				zombies_view  
			WHERE 
				id = ?
		) AS z
		CROSS JOIN (
			SELECT
				v.id AS citubeId,
				v.channel_id AS cid,
				v.yt_video_id  AS youtubeId,
				v.video_type AS videoType,
				c.eng AS category,
				v.link
			FROM 
				(SELECT  * FROM videos WHERE channel_id=34 )AS v
			JOIN (
				SELECT 
					a.id, 
					ct.eng 
				FROM 
					accounts AS a 
				INNER JOIN 
					categories AS ct 
				ON 
					a.category_id = ct.id
			) AS c
			ON 
				c.id = v.channel_id
			WHERE 
				v.status = 'published'
				AND v.video_type = 'long'
					
		)AS v
		LEFT JOIN 
			zombies_hit AS zh 
		ON 
			zh.video_id  = v.citubeId 
			AND zh.zombie_id  = z.id
		WHERE 
			zh.id IS NULL 
			AND v.link IS NOT NULL
		ORDER BY 
			RAND()
		LIMIT 5`;

		const result = await this.db.execute<RowDataPacket[]>(sql, [zid]);

		const watchDatas = result.map((v) => ({
			taskType: TASK_TYPE.WATCH,
			...v,
		}));

		return watchDatas as WatchTaskData[];
	}

	async saveSubscribeResult(message: SubscribeMessage) {
		const sql = `INSERT IGNORE INTO zombies_subscribe (zombie_id, channel_id) VALUES (?,?)`;
		await this.db.execute(sql, [message.data.zombie, message.data.channel]);
	}

	// async saveHitResult(message: HitMessage) {
	// 	try {
	// 		const sql = `
	//                     INSERT
	//                     IGNORE INTO zombies_hit (zombie_id, video_id) VALUES (?,?)`;
	// 		await this.db.execute(sql, [message.data.zombie, message.data.video]);
	// 	} catch (err) {
	// 		console.error(err);
	// 	}
	// }

	async getCitubeIdByYoutubeId(ytVideoId: string) {
		const sql = `SELECT id FROM videos WHERE yt_video_id = ?`;
		const [result] = await this.db.query<RowDataPacket[]>(sql, [ytVideoId]);
		if (!result || !result.id) return null;
		return result.id;
	}

	async saveWatchResult(message: WatchMessage) {
		const sql = `INSERT IGNORE INTO zombies_hit (zombie_id, video_id, time) VALUES (?,?,?)`;
		await this.db.execute(sql, [message.data.zombie, message.data.video, message.data.time]);
	}

	async saveLikeResult(message: LikeMessage) {
		const sql = `
                            INSERT
                            IGNORE INTO zombies_like (zombie_id, video_id) VALUES (?,?)`;
		await this.db.execute(sql, [message.data.zombie, message.data.video]);
	}

	async saveCommentResult(message: CommentMessage) {
		const sql = `
                INSERT IGNORE INTO zombies_comment (zombie_id, video_id) VALUES (?,?)`;
		await this.db.execute(sql, [message.data.zombie, message.data.video]);
	}

	async changePassword(message: ChangePasswordMessage) {
		const sql = `
		UPDATE 
			zombies
                SET 
			password='ci426600*'
                WHERE 
			id = ? `;
		await this.db.execute(sql, [message.data.zombie]);
	}

	async checkZombieDead(message: LoginFailMessage) {
		const sql = `
                UPDATE 
			zombies
                SET 
			is_dead = ?,
                        msg=?,
                        proxy_id = NULL
                WHERE 
			id = ?`;
		await this.db.execute(sql, [message.data.status ?? 1, message.data.err ?? null, message.data.zombie]);
	}

	async checkZombieAlive(message: LoginSuccessMessage) {
		const sql = `
                UPDATE 
			zombies
                SET 
			is_dead = 0
                WHERE 
			id = ?`;
		await this.db.execute(sql, [message.data.zombie]);
	}

	async saveError(error: Message) {
		const sql = `
                INSERT IGNORE INTO  zombie_error (error, event_name) 
		VALUES (?,?)`;
		await this.db.execute(sql, [JSON.stringify(error.data), error.event ?? null]);
	}
}
