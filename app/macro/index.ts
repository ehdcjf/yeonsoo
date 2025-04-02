import { RedisMacro } from "./redis";
import { getMacroConfig, wait } from "@zombie/utils";
// import { Pool, type CWorker } from "./worker";
import fs from "fs";
// import type { Work } from "../interfaces";
import { EVENT, type Work } from "@zombie/interfaces";
import { type CWorker, Pool } from "./pool";
// import type { CancelWorkMessage, EndWorkMessage } from "../interfaces/message";

class Main {
	private pool: Pool;
	private redis: RedisMacro;
	private macroId: number;

	constructor() {
		const config = getMacroConfig();
		this.pool = new Pool(config.pool.size);
		this.macroId = +config.macroId;
		this.redis = RedisMacro.getInstance();
	}

	async connect() {
		if (this.redis.isConnected) return;
		await this.redis.connectViaSSH();
	}

	async run() {
		while (true) {
			if (!this.redis.isConnected) {
				console.error("REDIS DISCONNECTED!");
				await this.connect();
			}
			if (this.pool.isFull()) {
				console.warn("POOL IS FULL!");
				this.redis.listOff(this.macroId);
				await wait(20_000);
				continue;
			}

			this.redis.listOn(this.macroId);
			console.debug("Worker debug: ", this.pool.debugWorker());
			const work = await this.redis.fetchTask(this.macroId, 3);
			if (!work) continue;

			this.runTask(work);
			await wait(5000);
		}
	}

	private async runTask(work: Work) {
		let worker: CWorker | null = null;
		try {
			worker = await this.pool.get();
			worker.email = work.zombie.email;
			await worker?.run(work);
		} catch (err) {
			console.log(err);
		} finally {
			if (worker) {
				worker.email = null;
				this.pool.put(worker);
			}
		}
	}
}

const main = new Main();
await main.connect();
await main.run();
