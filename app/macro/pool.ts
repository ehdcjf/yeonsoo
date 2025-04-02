import { type Work, EVENT } from "@zombie/interfaces";
import { RedisMacro } from "./redis";
export class CWorker {
	public email: string | null = null;
	private redis: RedisMacro;
	constructor(public workerId: number) {
		this.redis = RedisMacro.getInstance();
	}



	async run(work: Work): Promise<void> {
		this.email = work.zombie.email;
		const zid = work.zombie.id;
		const ipRange = work.zombie.proxy?.host?.split(".")?.splice(0, 3)?.join(".") ?? null;
		const isAvailable = await this.redis.startWork(zid, ipRange);
		if (!isAvailable) return;

		return new Promise((resolve, reject) => {
			const crawler = new Worker("./zombie/zombie.ts");
			crawler.onmessage = (event) => {
				const message = event.data;
				this.redis.sendResult(message);
			};
			crawler.onerror = async (event) => {
				await this.redis.endWork("CANCEL", zid, ipRange);
				crawler.terminate();
				this.email = null;
				reject(event);
			};

			crawler.addEventListener("close", async (event) => {
				this.email = null;
				await this.redis.endWork("COMPLETE", zid, ipRange);
				resolve();
			});

			crawler.postMessage(work);
		});
	}
}

export class Pool {
	protected free: CWorker[] = [];
	protected queue: Array<(t: CWorker) => void> = [];
	protected workers: CWorker[] = [];
	// protected initialized = false;

	constructor(size: number) {
		for (let i = 0; i < size; ++i) {
			const worker = new CWorker(i + 1);
			this.free.push(worker);
			this.workers.push(worker);
		}
	}

	async get(): Promise<CWorker> {
		if (this.free.length) {
			return this.free.pop()!;
		}
		return new Promise((resolve) => {
			this.queue.push(resolve);
		});
	}

	put(resource: CWorker) {
		if (this.queue.length) {
			return this.queue.shift()!(resource);
		}

		this.free.push(resource);
	}

	isFull() {
		return this.queue.length > 0;
	}

	debugWorker() {
		return this.workers.map((v) => v.email);
	}
}
