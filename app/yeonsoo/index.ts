import { connect, type ConnectResult } from "puppeteer-real-browser";
import os from 'os'
import path from 'path'
import { existsSync } from 'fs'
import { sleep } from 'bun'
type Browser = ConnectResult["browser"];
type Page = ConnectResult["page"];


export class Yeonsoo {
    protected page!: Page;
    protected browser!: Browser;

    constructor() { }

    private getChromePath() {
        const platform = os.platform();
        const possiblePaths: string[] = [];
        switch (platform) {
            case "darwin":
                possiblePaths.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
                break;
            case "linux":
                possiblePaths.push("/usr/bin/google-chrome")!;
                possiblePaths.push("/usr/local/bin/google-chrome")!;
                possiblePaths.push("/snap/bin/chromium")!;
                break;
            case "win32":
                possiblePaths.push(
                    path.join(
                        process.env["PROGRAMFILES(X86)"]!,
                        "Google/Chrome/Application/chrome.exe"
                    )
                );
                possiblePaths.push(
                    path.join(process.env["PROGRAMFILES"]!, "Google/Chrome/Application/chrome.exe")
                );
                possiblePaths.push(
                    path.join(process.env["LOCALAPPDATA"]!, "Google/Chrome/Application/chrome.exe")
                );
                break;
        }

        const chromePath = possiblePaths.find((p) => existsSync(p));
        if (!chromePath) {
            console.error("Chrome executable not found on this system.");
            process.exit(1);
        }
        return chromePath;
    }

    public async init() {
        const chromePath = this.getChromePath();
        const context = await connect({
            headless: false,
            customConfig: {
                chromePath: chromePath,
            },
            args: [
                "--start-maximized",
                "--disable-sync", // 브라우저 동기화 기능을 비활성화
                "--mute-audio", // 오디오 음소거 한다.
                "--disable-notifications", // 쓸데없는 알림 안나오게
            ],
        });
        this.page = context.page;
        this.browser = context.browser;

        await this.setPuppeteer();
        await sleep(1000);
        await this.page.goto("https://www.neti.go.kr/system/login/login.do", {
            waitUntil: "networkidle2",
        });
    }

    private async setPuppeteer() {
        // await this.page.setViewport({ width: 1920, height: 1080 });
        await this.page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
        );
        await this.page.setExtraHTTPHeaders({
            "accept-language": "en-US,en;q=0.9,hy;q=0.8",
        });
    }

    public async login() {
        await this.typeIntoInputByName('userInputId', 'kdch0823')
        await this.typeIntoInputByName('userInputPw', 'dc66260177!')
        await this.page.keyboard.press('Enter')
        await sleep(2000)
    }


    private async typeIntoInputByName(targetName: string, text: string): Promise<void> {
        try {
            const selector = `input[name="${targetName}"]`;
            await this.page.waitForSelector(selector, {
                timeout: 5000,
            });
            await this.page.type(selector, text, { delay: 100 });
        } catch (err) {
            throw new Error(`Fail [typeIntoInputByName]: ${targetName + " " + text}`);
        }
    }

    async listen() {
        await this.page.goto('https://www.neti.go.kr/lh/ms/cs/atnlcListView.do?menuId=1000006046',{waitUntil:'networkidle2'})
        await sleep(2000)
        const list = await this.page.$$('#crseList>li')
        console.log(list.length);
        
        for(const li of list){
            const progress = await li.$('div.bar');
            if(!progress) continue;
            const progressBar = await progress.evaluate((e) => e.style.width); 
            console.log(progressBar)
            const nowProgress = Number(progressBar.replace('%',''));
            if(nowProgress>=100) continue;
            const aTags = await li?.$$("a");
            if (!aTags) continue;
            for(const aTag of aTags){
                const content = await aTag.evaluate((e)=>e.innerText);
                if(content!=='이어보기') continue;

                const [newPage] = await Promise.all([
                    new Promise<Page>(resolve =>
                      this.browser.once('targetcreated', async target => {
                        const newPage = await target.page() ;
                        await newPage?.bringToFront();
                        resolve(newPage as Page);
                      })
                    ),
                    this.page.realClick(aTag) 
                  ]);


                  console.log(newPage)
            }    
        }

        
        
        
    }

}


const test = new Yeonsoo()
await test.init()
await test.login()
await test.listen()


// name  userInputId
// name  userInputPw

