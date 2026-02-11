import { Buffer } from "buffer";
import * as core from "@actions/core";
import * as yaml from "js-yaml";
import jp from "jsonpath";

export async function run(): Promise<void> {
  try {
    core.info(`Starting helm deploy action`);
    const username: string = core.getInput("username");
    const password: string = core.getInput("password");
    const jsonpath: string = core.getInput("jsonpath");
    const workspace: string = core.getInput("workspace");
    const repository: string = core.getInput("repository");
    const file: string = core.getInput("file");
    const value: string = core.getInput("value");

    const auth =
      "Basic " +
      Buffer.from(`${username}:${password}`, "binary").toString("base64");
    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repository}/src/HEAD/${file}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Authorization: auth,
        },
      },
    );

    if (response.ok) {
      core.info(`Successfully fetched values from ${file}`);
      const text = await response.text();
      const yamlDoc = yaml.load(text) as any;
      jp.value(yamlDoc, jsonpath, value);

      const formData = new FormData();
      formData.append("author", "carepaybot <admin@carepay.com>");
      formData.append("message", `${file} to ${value} [skip ci]`);
      formData.append(file, yaml.dump(yamlDoc));

      const response2 = await fetch(
        `https://api.bitbucket.org/2.0/repositories/${workspace}/${repository}/src`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(username + ":" + password).toString("base64"),
          },
          body: formData,
        },
      );

      if (response2.ok) {
        core.info(`Successfully updated values from ${file}`);
      } else {
        core.setFailed(
          `Failed to update Bitbucket: ${response2.status} ${response2.statusText}`,
        );
      }
    } else {
      core.setFailed(
        `Failed to fetch from Bitbucket https://api.bitbucket.org/2.0/repositories/${workspace}/${repository}/src/HEAD/${file}: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
