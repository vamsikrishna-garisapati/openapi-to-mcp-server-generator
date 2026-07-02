import { Actor } from "apify";
import { runActor } from "./handler.js";

await Actor.main(async () => {
  await runActor();
});
