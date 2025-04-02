import { Client } from "ssh2";
import net from "net";
import { createClient } from "redis";
import { wait, getMacroConfig } from "@zombie/utils";
import type { Work } from "@zombie/interfaces";

type RedisClient = Awaited<ReturnType<typeof createClient>>;

type TunnelClient = Client;

export class Redis {
	protected tunnelClient?: TunnelClient;
	protected client?: RedisClient;
	protected isReconnecting: boolean = false;
	public isConnected: boolean = false;

	protected sshConfig?: {
		username: string;
		host: string;
		port: number;
		password: string;
		srcHost: string;
		srcPort: number;
		dstHost: string;
		dstPort: number;
	};
	public macroId!: number;

	constructor() {}

	async connectViaSSH() {
		const config = getMacroConfig();
		this.sshConfig = config.ssh;
		this.macroId = config.macroId;
		while (!this.isConnected) {
			try {
				await this.connectToRedisViaSSH();
			} catch (err) {
				console.error("Connection Fail");
			} finally {
				await wait(3000);
			}
		}
	}

	//FIXME: 이 메서드 정리 필요.
	protected async connectToRedisViaSSH() {
		if (this.isConnected) return;
		console.log("Try to Connect:SSH Tunnel");
		const { connection, port }: { connection: TunnelClient; port: number } = await new Promise(
			(resolve, reject) => {
				const conn = new Client();
				conn.on("ready", () => {
					conn.forwardOut(
						this.sshConfig?.srcHost ?? "127.0.0.1",
						0, // 소스 포트 (자동 할당)
						this.sshConfig?.dstHost ?? "localhost",
						this.sshConfig?.dstPort ?? 6379,
						(err, stream) => {
							if (err) {
								//console.error("Tunnel error:", err);
								conn.destroy(); // SSH 연결 종료
								return reject(err); // 에러를 reject로 전달
							}

							// 로컬 포트를 통해 Redis에 접근 가능하게 설정
							const server = net.createServer((socket) => {
								socket.pipe(stream).pipe(socket);
							});

							server.on("error", (err) => {
								// console.error("Tunnel Server Error:", err);
								server.close();
								return reject(err); // 에러를 reject로 전달
							});

							server.on("close", () => {
								console.log("Tunnel server closed");
								if (this.isConnected) this.handleDisconnectViaSSH();
							});

							conn.on("close", () => {
								console.log("SSH connection closed");
								server.close();
								if (this.isConnected) this.handleDisconnectViaSSH();
							});

							server.listen(0, this.sshConfig?.srcHost ?? "127.0.0.1", () => {
								const port = (server.address() as net.AddressInfo).port;
								console.log(
									`Tunnel Server established at ${
										this.sshConfig?.srcHost ?? "127.0.0.1"
									}:${port}`
								);
								resolve({
									connection: conn,
									port,
								});
							});
						}
					);
				})
					.on("error", (err) => {
						console.error("SSH connection error:", err);
						conn.destroy();
						reject(err); // 에러를 reject로 전달
						if (this.isConnected) this.handleDisconnectViaSSH();
					})
					.connect({
						host: this.sshConfig?.host,
						port: this.sshConfig?.port,
						username: this.sshConfig?.username,
						password: this.sshConfig?.password,
						timeout: 2000,
					});
			}
		);

		this.tunnelClient = connection;
		console.log("SSH Tunnel established");

		const redisClient = await createClient({
			socket: { host: this.sshConfig?.srcHost, port: port },
		})
			.on("error", (err) => {
				// console.error("Redis error:", err);
				if (this.isConnected) this.handleDisconnectViaSSH();
			})
			.on("end", () => {
				console.warn("Redis client disconnected");
				if (this.isConnected) this.handleDisconnectViaSSH();
			})
			.connect();

		console.log("Connected to Redis via SSH Tunnel");

		// Redis 상태 확인
		const response = await redisClient.ping();
		if (response !== "PONG") {
			throw new Error("Redis server is not responding correctly.");
		}

		console.log("Redis server is active and responding");
		this.client = redisClient;
		this.isConnected = true;
		this.isReconnecting = false;
	}

	protected async handleDisconnectViaSSH() {
		if (this.isReconnecting) return;

		this.isReconnecting = true;
		this.isConnected = false;

		if (this.tunnelClient) {
			try {
				this.tunnelClient.end();
				console.log("Previous SSH tunnel closed.");
			} catch (err) {
				console.error("Error closing previous SSH tunnel:", err);
			} finally {
				this.tunnelClient = undefined;
			}
		}

		// Redis 클라이언트 종료
		if (this.client) {
			try {
				if (this.client.isOpen) {
					await this.client.disconnect();
					console.log("Previous Redis client closed.");
				}
			} catch (err) {
				console.error("Error closing previous Redis client:", err);
			} finally {
				this.client = undefined; // 클라이언트를 명시적으로 초기화
			}
		}

		console.log("Attempting to reconnect in 3 seconds...");
		await wait(3000);
		try {
			await this.connectToRedisViaSSH();
		} catch (err) {
			// console.error("Reconnection attempt failed:", err);
			this.isReconnecting = false;
			await this.handleDisconnectViaSSH(); // 재귀적으로 재시도
		} finally {
			this.isReconnecting = false;
		}
	}

	async connect() {
		while (!this.isConnected) {
			try {
				await this.connectToRedis();
			} catch (err) {
				console.error("Connection Fail");
				await wait(3000);
			}
		}
	}

	protected async connectToRedis() {
		const redisClient = await createClient()
			.on("error", (err) => {
				if (this.isConnected) this.handleDisconnect();
			})
			.on("end", () => {
				console.warn("Redis client disconnected");
				if (this.isConnected) this.handleDisconnect();
			})
			.connect();

		console.log("Connected to Redis");

		// Redis 상태 확인
		const response = await redisClient.ping();
		if (response !== "PONG") {
			throw new Error("Redis server is not responding correctly.");
		}

		console.log("Redis server is active and responding");
		this.client = redisClient;
		this.isConnected = true;
		this.isReconnecting = false;
	}

	protected async handleDisconnect() {
		console.log("call", this.isReconnecting);
		if (this.isReconnecting) return;

		this.isReconnecting = true;
		this.isConnected = false;

		// Redis 클라이언트 종료
		if (this.client) {
			try {
				if (this.client.isOpen) {
					await this.client.disconnect();
					console.log("Previous Redis client closed.");
				}
			} catch (err) {
				console.error("Error closing previous Redis client:", err);
			} finally {
				this.client = undefined; // 클라이언트를 명시적으로 초기화
			}
		}

		console.log("Attempting to reconnect in 3 seconds...");
		await wait(3000);
		try {
			await this.connectToRedis();
		} catch (err) {
			// console.error("Reconnection attempt failed:", err);
			this.isReconnecting = false;
			await this.handleDisconnect(); // 재귀적으로 재시도
		} finally {
			this.isReconnecting = false;
		}
	}

	protected createQueueName(macroId: number) {
		return `macro.${macroId}`;
	}
}

export class ResdisListMacro extends Redis {
	constructor() {
		super();
	}

	async fetchTask(macroId: number, timeout: number): Promise<Work | null> {
		if (!this.client) {
			console.log("Redis client is not connected.");
			return null;
		}
		const queueName = this.createQueueName(macroId);
		const result = await this.client.brPop(queueName, timeout);

		if (result?.element) {
			// console.log(`Fetched task: ${task}`);
			return JSON.parse(result?.element) as Work;
		} else {
			// console.log("No tasks available.");
			return null;
		}
	}

	async enqueueAgain(macroId: number, work: Work) {
		if (!this.client) {
			console.log("Redis client is not connected.");
			return null;
		}
		const queueName = this.createQueueName(macroId);
		await this.client.lPush(queueName, JSON.stringify(work));
	}

	/**
	 * 워커: 작업 완료 처리 (결과)
	 * @param task - 완료된 작업 데이터
	 */
	async sendResult<T>(message: T) {
		if (!this.client) {
			console.error("Redis client is not connected.");
			return;
		}

		await this.client.lPush("result", JSON.stringify(message));
		// console.log(`Send Result: ${JSON.stringify(message)}`);
	}

	/**
	 * 워커: 작업 완료 처리  (에러)
	 * @param task - 완료된 작업 데이터
	 */
	async sendError<T>(message: T) {
		if (!this.client) {
			console.error("Redis client is not connected.");
			return;
		}

		await this.client.lPush("error", JSON.stringify(message));
		// console.error(`Send Error ${JSON.stringify(message)}`);
	}
}
