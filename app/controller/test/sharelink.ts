import { Database, type RowDataPacket } from "@zombie/database";
import type { SharedLinkTaskData, Work } from "@zombie/interfaces";
import { parseProxyIp } from "@zombie/utils";

const SHARE_LINK_TASK: SharedLinkTaskData[] = [
	// 0 공유링크가 들어있는 디씨인사이드 게시물에 클릭으로 접근해서 약 8분간 시청 후 구독
	{
		taskType: "SHARELINK0",
		data: {
			link: "https://gall.dcinside.com/mgallery/board/view/?id=vivamunseong&no=14", // 디씨인사이드 링크
			channelId: 32,
			citubeId: 2514,
		},
	},
	// 1  공유링크가 들어있는 디씨인사이드 게시물에 링크 클릭으로 접근해서 약 8분간 시청
	{
		taskType: "SHARELINK1",
		data: {
			link: "https://gall.dcinside.com/mgallery/board/view/?id=vivamunseong&no=13&page=1",
			channelId: 33,
			citubeId: 3167,
		},
	},
	// 2 공유링크를 통해 영상에 직접 접근한 후 약 8분간 시청하고 구독한 후 새로운 공유링크를 반환
	{
		taskType: "SHARELINK2",
		data: {
			link: "https://youtu.be/ICgiqie8J38?si=-VoZQDzaErQlBkN3",
			channelId: 385,
			citubeId: 2467,
		},
	},
	// 3 공유링크를 통해 영상에 직접 접근한 후 약 8분간 시청 후 새로운 공유링크를 반환
	{
		taskType: "SHARELINK3",
		data: {
			link: "https://youtu.be/OFDILsX0Lxo?si=XUH36iUghyLcbHA5",
			channelId: 383,
			citubeId: 2469,
		},
	},
	// 4 공유링크를 통해 영상에 접근. 영상상에서 다시 채널로 이동.
	// 채널에서 비디오탭으로 이동한 후, 두개 영상을 큐에 넣고, 시청
	// 첫번쨰 영상을 약 8분간 시청 후 두번쨰 영상으로 이동
	// 두번쨰 영상을 약 8분간 시청하고 구독 후 새로운 공유링크 반환
	{
		taskType: "SHARELINK4",
		data: {
			link: "https://youtu.be/1sJZWGxkNGU?si=zroklqBWYBuL2JvO",
			channelId: 434,
			citubeId: 2511,
		},
	},
	// 5 공유링크를 통해 영상에 접근. 영상상에서 다시 채널로 이동.
	// 채널에서 비디오탭으로 이동한 후, 두개 영상을 큐에 넣고, 시청
	// 첫번쨰 영상을 약 8분간 시청 후 구독하고 두번쨰 영상으로 이동
	// 두번쨰 영상을 약 8분간 시청하고 새로운 공유링크 반환
	{
		taskType: "SHARELINK5",
		data: {
			link: "https://youtu.be/F-4HtUBDX7k?si=teTk53nVty_0qhKL",
			channelId: 428,
			citubeId: 2506,
		},
	},
	// 6 트위터 링크로 시청
	{
		taskType: "SHARELINK6",
		data: {
			link: "https://t.co/gy3HIeBz3x",
			channelId: 34,
			citubeId: 3169,
		},
	},
];

export class ShareLinkTaskGen {
	private db: Database;
	private sharelink = SHARE_LINK_TASK.map((v) => new Set(v.data.link));

	constructor() {
		this.db = Database.getInstance();
	}

	public async init() {
		await this.db.connect();
	}

	public async getWorks(index: 0 | 1 | 2 | 3 | 4 | 5 | 6): Promise<Work[]> {
		const task = SHARE_LINK_TASK[index];
		const { channelId, citubeId } = task.data;
		const zombies = await this.db.query<RowDataPacket[]>(
			`
		SELECT 
			z.* 
		FROM 
			zombies_view AS z
		CROSS JOIN (
			SELECT 
				* 
			FROM 
				channel 
			WHERE 
				id = ? 
		) AS c
		CROSS JOIN (
			SELECT 
				* 
			FROM 
				videos 
			WHERE 
				id = ?
		) AS v
		LEFT JOIN 
			zombies_subscribe AS zs
		ON 
			z.id = zs.zombie_id 
			AND c.id = zs.channel_id 
		LEFT JOIN 
			zombies_hit AS zh 
		ON 
			z.id = zh.zombie_id 
			AND v.id = zh.video_id 
		WHERE 
			zs.id IS NULL 
			AND zh.id IS NULL`,
			[channelId, citubeId]
		);

		if (index > 1 && index < 6) {
			task.data.link = [...this.sharelink[index]][
				Math.floor(Math.random() * this.sharelink[index].size)
			];
		}
		return zombies.map((v) => ({
			zombie: {
				email: v.email,
				password: v.password,
				id: v.id,
				proxy: parseProxyIp(v.ip),
				recovery: v.recovery,
			},
			tasks: [task],
		}));
	}

	public addShareLink(taskType: SharedLinkTaskData["taskType"], newLink: string) {
		const index = Number(taskType.replace(/\D/g, ""));
		this.sharelink[index].add(newLink);
	}
}
