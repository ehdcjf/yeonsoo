import type { ZombieInfo, WatchTaskData } from "@zombie/interfaces";
import { wait } from "@zombie/utils";
import { DefaultTask } from "./task";
import { COMMENTS } from "../data/comments";
import type { Puppeteer } from "@zombie/puppeteer";

export class WatchTask extends DefaultTask {
	private setMin = 8;
	private setMax = 15;

	private interactMin = 40;
	private interactMax = 60;

	private watchMin = 90;
	private watchMax = 110;

	private clickLike = Math.random() < 0.02;

	constructor(puppeteer: Puppeteer, zombie: ZombieInfo, private task: WatchTaskData) {
		super(puppeteer, zombie);
	}

	async run(): Promise<number> {
		await this.gotoWhatsappWeb();
		await wait(2000);
		await this.playVideo();
		await wait(2000);
		const duration = await this.getDuration();
		const settingTime = this.getRandTime(duration, this.setMin, this.setMax);
		const interactTime = this.getRandTime(duration, this.interactMin, this.interactMax);
		const watchTime = this.getRandTime(duration, this.watchMin, this.watchMax);
		console.log(duration)
		setTimeout(this.setting.bind(this), settingTime * 1000);
		setTimeout(this.interact.bind(this), interactTime * 1000);
		await wait(watchTime * 1000);
		console.log(`Watch time: ${watchTime}`);
		return watchTime;
	}

	protected async playVideo() {
		try {
			await this.page.reload();
			await wait(2000);
			await this.page.realCursor.move("button.ytp-large-play-button", { maxTries: 10 });
			await this.page.realClick("button.ytp-large-play-button");
		} catch {
			await this.page.keyboard.press("Space");
			const playButton = await this.page.$("button.ytp-play-button");
			if (playButton) {
				console.log("Find PlayButton");
				const title = await playButton.evaluate((btn) =>
					btn.getAttribute("data-title-no-tooltip")
				);

				if (title != "Pause") await this.page.keyboard.press("Space");
			} else {
				console.error("Not Found PlayButton");
				const currentSpan = await this.page.$("span.ytp-time-current");
				const current1 = await currentSpan?.evaluate((span) => span.innerHTML);
				await wait(2000);
				const current2 = await currentSpan?.evaluate((span) => span.innerHTML);
				if (current1 === current2) await this.page.keyboard.press("Space");
			}
		}
	}

	private async gotoWhatsappWeb(){
		await this.page.goto("https://web.whatsapp.com", {
			waitUntil: "networkidle2",
		});
		await wait(6000);
		await this.page.$('div#pane-side');
		const myChat2 = await this.page.$('span[title="+82 10-2574-5311"]')
		if (!myChat2)throw new Error('Not Found My Chat')
		await  this.page.realClick('span[title="+82 10-2574-5311"]')

		const allAtags = await this.page.$$("a");

		for (const anchor of allAtags) {
			const href = await anchor.evaluate(async (a) => {
				a.removeAttribute("target");
				return a.href;
			});

			if (href.includes("youtu.be") || href.includes("youtube.com")) {
				await anchor.click();
				break;
			}
		}
	}

	private async gotoVideo() {
		if (this.task.link.includes("dcinside")) {
			await this.page.goto("https://www.dcinside.com/", { waitUntil: "networkidle2" });
			await this.page.goto("https://gall.dcinside.com/mgallery/board/lists/?id=vivamunseong");
			await wait(2000);
			await this.page.goto(this.task.link, { waitUntil: "networkidle2" });
			await wait(2000);
		} else if (this.task.link.includes("blogspot")) {
			await this.page.goto("https://www.google.com/", { waitUntil: "networkidle2" });
			await wait(2000);
			await this.page.goto(this.task.link, { waitUntil: "networkidle2" });
			await wait(2000);
		} else if (this.task.link.includes('watchapp')){



		}

		const allAtags = await this.page.$$("a");

		for (const anchor of allAtags) {
			const href = await anchor.evaluate(async (a) => {
				a.removeAttribute("target");
				return a.href;
			});
			if (
				href.includes(`youtu.be/${this.task.youtubeId}`) ||
				(href.includes("youtube.com") && href.includes(this.task.youtubeId))
			) {
				await anchor.click();
				return;
			}
		}

		throw new Error("Not Found Link: " + `youtu.be/${this.task.youtubeId}`);
	}

	private async getDuration() {
		const durationSpan = await this.page.$("span.ytp-time-duration");
		const duration = await durationSpan?.evaluate((span) => span.innerHTML);
		return duration
			? duration
					.split(":")
					.map(Number)
					.reverse()
					.reduce((r, v, i) => {
						r += Math.pow(60, i) * v;
						return r;
					}, 0)
			: 600;
	}

	private getRandTime(duration: number, min: number, max: number) {
		const rand = Math.floor(Math.random() * (max - min + 1) + min);
		return Math.floor((rand * duration) / 100);
	}

	private async setting() {
		try {
			const player = await this.page.$("div#player-container-outer");
			if (!player) throw new Error("Not Found Player");
			await this.page.realCursor.move(player);
			const settingButton = await this.page.$("button.ytp-button.ytp-settings-button");
			if (!settingButton) throw new Error("Not Found Setting Button");
			await this.page.realClick(settingButton);
			await wait(400);
			const menu = await this.page.$("div.ytp-settings-menu");
			if (!menu) throw new Error("Not Found Setting Menu");
			const menuItems = await this.page.$$("div.ytp-menuitem");
			if (!menuItems) throw new Error("Not Found Setting Menu Item");
			await this.page.realClick(menuItems[menuItems.length - 1]);
			await wait(900);
			const qualityMenuItems = await this.page.$$("div.ytp-menuitem-label");
			if (!qualityMenuItems) throw new Error("Not Found Quality Setting Item");

			if (Math.random() < 0.5) {
				await this.page.realClick(qualityMenuItems[0]);
				await wait(1000);
				if (Math.random() < 0.5) await this.page.keyboard.press("t");
			} else {
				await this.page.realClick(qualityMenuItems[1]);
			}
		} catch (err) {
			console.error(err);
			console.error("Fail To Set Video Quality");
		}
	}

	private async like() {
		const likeButtonSelectors = [
			"#top-level-buttons-computed > ytd-toggle-button-renderer:nth-child(1) yt-icon-button",
			"#top-level-buttons-computed > ytd-toggle-button-renderer:nth-child(1) button",
			"#segmented-like-button button",
			"like-button-view-model button",
		];

		for (const selector of likeButtonSelectors) {
			try {
				const button = await this.page.$(selector);
				if (button) {
					const isClicked = await this.page.evaluate((button) => {
						return (
							(button.classList.contains("style-default-active") &&
								!button.classList.contains("size-default")) ||
							button.getAttribute("aria-pressed") === "true"
						);
					}, button);
					if (!isClicked) {
						await this.page.realClick(selector);
						return true;
					}
				}
			} catch (error) {
				console.error(`Error with selector: ${selector}`, error);
			}
		}
		return false;
	}

	private async comment() {
		try {
			const scrollRand = Math.floor(Math.random() * 100) + 500;
			await this.scrollDown(scrollRand, 20);
			await wait(3000);

			const placeholder = await this.page.$("div#placeholder-area");
			if (!placeholder) throw new Error("Not Found Placeholder");
			await this.page.realClick(placeholder);
			await wait(1500);

			const commentInput = await this.page.$("div#contenteditable-root");
			if (!commentInput) throw new Error("Not Found Comment Input");
			await this.page.realClick(commentInput);
			const comment = this.getRandomComment();
			await this.page.type("div#contenteditable-root", comment, { delay: 100 });

			const commentButton = await this.page.$('button[aria-label="Comment"]');
			if (!commentButton) throw new Error("Not Found Comment Button");
			await this.page.realClick(commentButton);
			await wait(5000);

			await this.scrollUp(scrollRand, 20);
		} catch (err: any) {
			console.error(err);
		}
	}

	private getRandomComment() {
		try {
			const type = this.zombie.id % 2;
			const comments = COMMENTS[type];
			let comment = comments[Math.floor(Math.random() * comments.length)];
			if (comment.includes("${category}"))
				return comment.replaceAll("${category}", this.task.category ?? "video");
			else return comment;
		} catch {
			return "Ah... so this is what no effort looks like.";
		}
	}

	private async interact() {
		if (this.clickLike) {
			const isLike = await this.like();
			if (isLike && Math.random() < 0.1) await this.comment();
		}
		await this.scrollDownUp(Math.floor(Math.random() * 500) + 500);
	}
}






