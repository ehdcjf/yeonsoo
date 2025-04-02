import { createPool, type Pool, type PoolConnection, type QueryResult } from "mysql2/promise";

export type { ResultSetHeader } from "mysql2/promise";
export type { RowDataPacket } from "mysql2/promise";

export class Database {
	private static instance: Database;
	private pool!: Pool;
	private config: {
		host: string;
		port: number;
		user: string;
		password: string;
		database: string;
		connectionLimit: number;
	};

	private constructor() {
		this.config = {
			host: process.env["DB_HOST"]!,
			port: Number(process.env["DB_PORT"])!,
			user: process.env["DB_USER"]!,
			password: process.env["DB_PASSWORD"]!,
			database: process.env["DB_DATABASE"]!,
			connectionLimit: +process.env["DB_POOL_SIZE"]!,
		};
	}

	public static getInstance() {
		Database.instance ??= new Database();
		return Database.instance;
	}

	public async connect() {
		if (this.pool) return this.pool;
		if (Object.values(this.config).some((v) => !v)) {
			console.error("Invalid ENV");
			process.exit(1);
		}

		this.pool = await new Promise<Pool>(async (resolve, reject) => {
			try {
				const pool = createPool(this.config);
				const connection = await pool.getConnection();
				if (connection) {
					await connection.query("SELECT 1");
					connection.release();
					resolve(pool);
					console.log("DB Connected");
				} else {
					throw new Error("DB Connection Error");
				}
			} catch (err) {
				console.error("DB connection Error");
				reject(err);
			}
		});
	}

	private async checkPool() {
		if (!this.pool) {
			console.log("Reconnect Connection");
			try {
				await this.connect();
			} catch (err) {
				console.error(err);
				throw new Error("Connection Fail");
			}
		}
	}

	async query<T extends QueryResult>(queryString: string, params: unknown[] = []): Promise<T> {
		await this.checkPool();
		try {
			const [rows] = await this.pool.query<T>(queryString, params);

			return rows;
		} catch (err) {
			console.error(err);
			throw new Error("DB ERROR");
		}
	}

	async execute<T extends QueryResult>(queryString: string, params: unknown[] = []): Promise<T> {
		await this.checkPool();
		try {
			const [rows] = await this.pool.execute<T>(queryString, params);
			return rows;
		} catch (err) {
			console.error(err);
			throw new Error("DB ERROR");
		}
	}

	async transaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
		await this.checkPool();
		const connection = await this.pool.getConnection();

		try {
			await connection.beginTransaction();
			const txResult = await callback(connection);
			await connection.commit();
			return txResult;
		} catch (err) {
			await connection.rollback();
			console.error(err);
			throw new Error("DB ERROR");
		} finally {
			connection.release();
		}
	}
}
