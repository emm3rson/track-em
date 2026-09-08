import { getDb } from "../data/getDb";

export async function bootstrap() {
  await getDb();
}
