export type ZombieInfo = {
	id: number;
	email: string;
	password: string;
	recovery: string;
	proxy?: {
		host: string;
		port: number;
		username: string;
		password: string;
	};
};
