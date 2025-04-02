import type { ZombieInfo, Browser, Page } from "@zombie/interfaces";
import { wait } from "@zombie/utils";
import { DefaultTask } from "./task";
import type { Puppeteer } from "@zombie/puppeteer";

export class ChangePasswordTask extends DefaultTask {
	constructor(puppeteer: Puppeteer, zombie: ZombieInfo) {
		super(puppeteer, zombie);
	}

	async run() {
		await this.page.goto("https://myaccount.google.com/u/0/security");
		await wait(3000);

		const section = await this.page.$("section");

		const aTags = await section?.$$("a"); // 'section' 안의 모든 'a' 태그를 선택

		if (!aTags) return;
		const hrefs = await Promise.all(
			aTags.map(async (a) => {
				return await a.evaluate((anchor) => anchor.href); // 'href' 속성 값 추출
			})
		);

		const chpwLink = hrefs.find((v) => v.includes("/password?"));
		if (!chpwLink) return;
		await this.page.goto(chpwLink);
		await this.typePassword();
	}

	private async typePassword(): Promise<boolean | void> {
		await wait(4000);
		const form = await this.page.$("form");
		if (!form) throw new Error("Not Found Form");
		const pwinputs = await this.page.$$("input[type='password']");

		if (pwinputs.length == 1) {
			await wait(1000);
			await pwinputs[0].type(this.zombie.password, { delay: 100 });
			await wait(1000);
			await this.clickById("passwordNext");
			await this.typePassword();
		} else if (pwinputs.length == 2) {
			await pwinputs[0].type("ci426600*", { delay: 100 });
			await this.page.keyboard.press("Tab");
			await wait(1000);
			await pwinputs[1].type("ci426600*", { delay: 100 });
			await wait(1000);
			const button = await this.page.$(`button[type='submit']`);
			await this.page.realClick(button);
			await wait(2000);
			const okButton = await this.page.$('button[data-mdc-dialog-action="ok"]'); // 요소 선택
			if (okButton) {
				await okButton.click();
				await this.page.goto("https://www.youtube.com", {
					waitUntil: "networkidle2",
				});
				return true;
			}
			throw new Error("Fail To Click Ok Button");
		} else {
			throw new Error("Invalid Input Length");
		}
	}
}
