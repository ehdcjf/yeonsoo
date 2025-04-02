import { Redis } from "@zombie/redis";
import { EVENT, type Message, type Work } from "@zombie/interfaces";
import type { SetOptions } from "redis";

export class RedisController extends Redis {
	public constructor() {
		super();
	}

	async get(key: string) {
		return await this.client?.get(key);
	}

	async set(key: string, value: string | number, options?: SetOptions) {
		return await this.client?.set(key, value, options ?? {});
	}

	async del(key: string) {
		return await this.client?.del(key);
	}

	public async getQueueSize(macroId: number) {
		if (!this.client) {
			console.log("Redis client is not connected.");
			return null;
		}
		const queueName = this.createQueueName(macroId);
		const result = await this.client.lLen(queueName);
		return result;
	}

	public async getResultSize(){
		if (!this.client) {
			console.log("Redis client is not connected.");
			return null;
		}

		return await this.client.lLen('result');
	}

	async isAvailableWork(zid: number, ipRange?: string) {
		const startKey = `START[${ipRange}]`;
		const endKey = `END[${ipRange}]`;
		const isAlreadyRunId = await this.get(zid.toString());
		const isExistStart = await this.get(startKey);
		const isExistIpEnd = await this.get(endKey);
		return !isAlreadyRunId && !isExistStart && !isExistIpEnd;
	}

	async command(macroId: number, work: Work) {
		if (!this.client) {
			console.error("Redis client is not connected.");
			return;
		}
		const queueName = this.createQueueName(macroId);
		await this.client.lPush(queueName, JSON.stringify(work));
		console.log(`Send work to macro.${macroId}`);
	}

	async fetchResult() {
		if (!this.client) {
			console.log("Redis client is not connected.");
			return null;
		}
		const result = await this.client.brPop("result", 1);

		if (result?.element) {
			return JSON.parse(result?.element) as Message;
		} else {
			return null;
		}
	}

	async getKeysByPattern(pattern: string) {
		if (!this.client) {
			console.log("Redis client is not connected.");
			return [];
		}
		const found: string[] = [];
		for await (const key of this.client.scanIterator({
			MATCH: pattern,
			// COUNT: 100,
		})) {
			found.push(key);
		}

		return found;
	}
}
