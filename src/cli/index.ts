import chalk from "chalk";
import path from "path";
import chokidar from "chokidar";
import { homedir } from "os";

import { Client } from "@sortql/core";
import { printHeader } from "@sortql/cli/dialogue";
import { checkConfig } from "@sortql/cli/config";

export const VERSION = "1.1.1";
export const GITHUB_URL = "https://github.com/leonmeka/sortql";
export const CONFIG_PATH = path.join(homedir(), ".sortql");

let isBlocked = false;

async function runQueries(client: Client, queries: string) {
  if (isBlocked) {
    return;
  }

  isBlocked = true;

  try {
    const content = Bun.file(queries);
    await client.run(await content.text());
  } catch (error) {
    console.error(chalk.red("Error running queries:"), error);
  } finally {
    isBlocked = false;
  }
}

async function watchDirectory(
  client: Client,
  config: {
    directory: string;
    queries: string;
    watch: boolean;
  }
) {
  chokidar
    .watch(config.directory, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignorePermissionErrors: true,
      interval: 100,
    })
    .on("all", async () => {
      if (isBlocked) {
        return;
      }

      printHeader(config);
      await runQueries(client, config.queries);
    });
}

export async function initSortQLCLI() {
  printHeader();
  const config = await checkConfig();

  const client = new Client(config.directory);

  if (config.watch) {
    await watchDirectory(client, config);
  }

  if (!config.watch) {
    printHeader(config);
    await runQueries(client, config.queries);
  }
}
