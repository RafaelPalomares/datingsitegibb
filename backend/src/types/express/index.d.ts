declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      email: string;
      role: "admin" | "user";
      shard: string;
    };
  }
}
