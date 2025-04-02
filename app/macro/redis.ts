import { Redis } from "@zombie/redis";
import { EVENT, type Message, type Work } from "@zombie/interfaces";
import type { SetOptions } from "redis";

export class RedisMacro extends Redis {
	private defaultIpRange = `IP.RANGE.DEFAULT`;
	private static instance: RedisMacro;

	private constructor() {
		super();
	}

	public static getInstance() {
		RedisMacro.instance ??= new RedisMacro();
		return RedisMacro.instance;
	}

	async get(key: string) {
		return await this.client?.get(key);
	}

	async set(key: string, value: string | number, options?: SetOptions) {
		return await this.client?.set(key, value, options ?? {});
	}

	async listOn(macroId: number) {
		this.client?.set("MACRO:" + macroId.toString(), 1, { EX: 20 });
	}

	async listOff(macroId: number) {
		this.client?.del("MACRO:" + macroId.toString());
	}

	async startWork(zid: number, ipRange?: string) {
		ipRange ??= this.defaultIpRange;
		const startKey = `START[${ipRange}]`;
		const endKey = `END[${ipRange}]`;
		const isAlreadyRunId = await this.get(zid.toString());
		const isExistStart = await this.get(startKey);
		const isExistIpEnd = await this.get(endKey);

		if (!isAlreadyRunId && !isExistStart && !isExistIpEnd) {
			await this.set(zid.toString(), 1);
			await this.set(startKey, 1);
			return true;
		} else {
			return false;
		}
	}

	async endWork(type: "COMPLETE" | "CANCEL", zid: number, ipRange?: string) {
		ipRange ??= this.defaultIpRange;
		const startKey = `START[${ipRange}]`;
		const endKey = `END[${ipRange}]`;
		await this.del(zid.toString());
		await this.del(startKey)
		if (type == "COMPLETE") await this.set(endKey, 1, { EX: 600 });
	}

	async del(key: string) {
		return await this.client?.del(key);
	}

	async fetchTask(macroId: number, timeout: number): Promise<Work | null> {
		if (!this.client) {
			console.log("Redis client is not connected.");
			return null;
		}
		const result = await this.client.brPop(this.createQueueName(macroId), timeout);

		if (result?.element) {
			// console.log(`Fetched task: ${task}`);
			return JSON.parse(result?.element) as Work;
		} else {
			// console.log("No tasks available.");
			return null;
		}
	}

	async sendResult(message: Message) {
		if (!this.client) {
			console.error("Redis client is not connected.");
			return;
		}
		await this.client.lPush("result", JSON.stringify(message));
		// console.log(`Send Result: ${JSON.stringify(message)}`);
	}
}
