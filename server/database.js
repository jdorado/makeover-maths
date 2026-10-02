import { MongoClient } from "mongodb";
let connection;

export async function savesCollection() {
  if (!process.env.MONGODB_DATABASE) throw new Error("MONGODB_DATABASE must be explicit for every game.");
  connection ||= new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 })
    .connect().catch((error) => { connection = null; throw error; });
  return (await connection).db(process.env.MONGODB_DATABASE).collection("game_saves");
}

