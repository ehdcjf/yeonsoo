export type MacroConfig = {
	mode: "development" | "production";
	ssh: {
		username: string;
		host: string;
		port: number;
		password: string;
		srcHost: string;
		srcPort: number;
		dstHost: string;
		dstPort: number;
	};
	macroId: number;
	pool: {
		size: number;
		limit?: number;
	};
};
