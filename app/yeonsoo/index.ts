import { connect, type ConnectResult} from "puppeteer-real-browser";
import os from 'os'
import path from 'path'
import { existsSync } from 'fs'
import { sleep } from 'bun'
type Browser = ConnectResult["browser"];
type Page = ConnectResult["page"];
type WEAKDAY = '월' | '화' | '수' | '목' | '금'



export class Yeonsoo {
    protected page!: Page;
    protected browser!: Browser;

    private TIME_TABLE: Record<WEAKDAY, number[]> = {
        '월': [1, 3, 5, 6, 7, 8],
        '화': [1, 3, 6, 7, 8],
        '수': [3, 4, 6, 7, 8],
        '목': [1, 3, 5, 6],
        '금': [2, 4, 6, 7],
    }

    private LECTURE_TIME = [
        [], //0
        [520, 570], //1
        [580, 630], //2
        [640, 690], //3
        [740, 790], //4
        [800, 850], //5
        [860, 910], //6
        [920, 970], //7
        [980, 1030], //8
    ]

    constructor() { }

    async run() {
        while (true) {
            try {
                await this.init()
                await this.login()
                await this.getLectureList()
            } catch (err) {
                console.error(err)
                await this.kill()
            }
        }
    }

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
        await this.typeIntoInputByName('userInputId', Bun.env.ID!)
        await this.typeIntoInputByName('userInputPw', Bun.env.PW!)
        await this.page.keyboard.press('Enter')
        await sleep(2000)
        console.log('로그인^_^')
    }



    async getAllLectureList(){
        await this.page.goto('https://www.neti.go.kr/lh/ms/cs/atnlcListView.do?menuId=1000006046', { waitUntil: 'networkidle2' })
        await sleep(2000)
        const lists = await this.page.$$('#crseList>li')
        return lists
    }

    // async findRemainLecture(lists:ElementHandle<HTMLLIElement>[]):Promise<ElementHandle<HTMLLIElement>[]>{
    //     const rList = [];
    //     for (const li of lists) {
    //         const titleAtag = await li.$("a.title");
    //         const title = await titleAtag?.evaluate(v => v.innerText);
    //         if (!title) continue;
    //         // 진행상태 확인
    //         const progress = await li.$('div.bar');
    //         if (!progress) continue;
    //         const progressBar = await progress.evaluate((e) => e.style.width);
    //         console.log(`${title}: ${progressBar}`)
    //         const nowProgress = Number(progressBar.replace('%', ''));
    //         // 전부 다 들은거 스킵
    //         if (nowProgress >= 100) {
    //             console.log(`SKIP ${title}: ${nowProgress}`)
    //             continue;
    //         }
    //         rList.push(li);
    //     }
    //     return rList;
    // }


    async getLectureList() {
        // const allLectures = await this.getAllLectureList() 
        // const remainLectures = await this.findRemainLecture(allLectures)
        await this.page.goto('https://www.neti.go.kr/lh/ms/cs/atnlcListView.do?menuId=1000006046', { waitUntil: 'networkidle2' })
        await sleep(2000)
        const lists = await this.page.$$('#crseList>li')
        for (const li of lists) {
            const titleAtag = await li?.$("a.title");
            const title = await titleAtag?.evaluate(v => v.innerText);
            if (!title) continue;
            // 진행상태 확인
            const progress = await li.$('div.bar');
            if (!progress) continue;
            const progressBar = await progress.evaluate((e) => e.style.width);
            console.log(`${title}: ${progressBar}`)
            const nowProgress = Number(progressBar.replace('%', ''));
            // 전부 다 들은거 스킵
            if (nowProgress >= 100) {
                console.log(`SKIP ${title}: ${nowProgress}`)
                continue;
            }

            // 이어보기 찾기
            const aTags = await li?.$$("a");
            if (!aTags) continue;

            for(const aTag of aTags){
                const content = await aTag.evaluate((e) => e.innerText);
                if (content !== '이어보기' && content !== '학습하기')  continue;
                console.log(`${title} ${content}`)
                const [newPage] = await Promise.all([
                    new Promise<Page>(resolve =>
                        this.browser.once('targetcreated', async target => {
                            const newPage = await target.page();
                            await newPage?.bringToFront();
                            resolve(newPage as Page);
                        })
                    ),
                    this.page.realClick(aTag)
                ]);
                this.page = newPage;
                await this.watchVideo()
            }
        }
    }


    async watchVideo(){
        await sleep(2000);
        const video = await this.page.$('video')
        if (!video) return;
        console.log('video 발견!')
        await this.clickQuizButton()

        const titleTag = await this.page.$('title');
        if (titleTag) {
            const videoTitle = await titleTag.evaluate(e => e.innerText)
            console.log(videoTitle)
        }

        const button = await this.page.$('button.vjs-big-play-button');
        if (!button) return;
        await this.page.realClick(button)
        console.log(`video 시작!`)
        while (true) {
            await this.waitUntilAvailableTime()
            let remainTime = null;
            const remainSpan = await this.page.$('.vjs-remaining-time-display');
            if (remainSpan) {
                do {
                    if (!remainSpan) break;
                    const temp = await remainSpan.evaluate((v) => v.innerHTML);
                    if (temp == remainTime) {
                        await sleep(2000)
                        const playBtn = await this.page.$('button.vjs-big-play-button');
                        if (!playBtn) continue;
                        this.page.realClick(playBtn)
                        console.log('video 시작!')
                    }
                    remainTime = temp
                    console.log(remainTime);

                    await sleep(10000)
                } while (remainTime != '0:00')
            }
            console.log('다음')
            await sleep(3000)
            const nextBtn = await this.page.$('div#next-btn');
            if (nextBtn) {
                try {

                    try {
                        await this.page.realClick(nextBtn)
                    } catch {
                        await this.page.click('div#next-btn')
                    }
                } catch { }
            }

            await sleep(3000)
            await this.clickQuizButton()
            await this.page.reload()
            await sleep(3000)

        }


    }


    // 요일, 시간
    private getNow() {
        const now = new Intl.DateTimeFormat("ko-KR", { weekday: 'short', hour: "numeric", minute: "numeric", hour12: false }).format(new Date())
        const weekday = now[1] as WEAKDAY
        const hour = +now.substring(4, 6) * 60
        const minute = +now.substring(7, 9)
        const time = hour + minute
        return { weekday, time }
    }

    // 수강 가능한 시간인지 확인
    private isAvailableTime() {
        const { weekday, time } = this.getNow();
        for (const tb of this.TIME_TABLE[weekday]) {
            const [start, end] = this.LECTURE_TIME[tb]
            if (time >= start && time <= end) return false;
        }
        return true;
    }

    // 수강 가능할때까지 기다리기
    async waitUntilAvailableTime() {
        while (true) {
            if (this.isAvailableTime()) break;
            await sleep(1000 * 60) // 1분 대기
            console.log('지금은 수업시간')
        }
        console.log('연수 시청 ㄱㄱ')
    }

    private async clickQuizButton() {
        const quizBtn = await this.page.$('div.quizShowBtn');
        if (quizBtn) {
            try {
                await this.page.realClick(quizBtn, { maxTries: 3 })
            } catch { }
        }
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

    public async kill() {
        if (!this.page.isClosed()) await this.page.close()
        if (this.browser.connected) await this.browser.close()
    }

}


const test = new Yeonsoo()
await test.run()

// name  userInputId
// name  userInputPw

