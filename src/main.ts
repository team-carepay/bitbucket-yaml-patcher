import { Buffer } from "buffer";
import * as core from "@actions/core";
import { parseDocument } from "yaml";
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
      // parseDocument keeps comments, blank lines and key order; a load/dump round-trip
      // rewrites the whole file and silently deletes every comment in it.
      const doc = parseDocument(text);
      // Only plain member/index steps map onto a YAML path. Wildcards, unions, filters and
      // script expressions parse fine but would silently produce a path that resolves to
      // nothing, so reject them here with a message that says which input was wrong.
      const steps = jp.parse(jsonpath) as {
        operation?: string;
        scope?: string;
        expression: { type: string; value: string | number };
      }[];
      const simple = (step: (typeof steps)[number]): boolean =>
        step.scope === "child" &&
        (step.operation === "member" || step.operation === "subscript") &&
        ["identifier", "numeric_literal", "string_literal"].includes(step.expression.type);
      if (steps[0]?.expression?.type !== "root" || !steps.slice(1).every(simple)) {
        core.setFailed(
          `Unsupported jsonpath "${jsonpath}": only plain paths like $.microservice.image.tag ` +
            `(member and index steps) can be mapped onto a YAML document.`,
        );
        return;
      }
      const path = steps.slice(1).map((step) => step.expression.value);
      const oldValue = doc.getIn(path);
      if (oldValue === undefined) {
        core.setFailed(`No value at ${jsonpath} in ${file} — refusing to write.`);
        return;
      }
      doc.setIn(path, value);
      core.info(`Update YAML ${jsonpath} from "${oldValue}" to "${value}"`);

      const formData = new FormData();
      formData.append("author", `${username} <admin@carepay.com>`);
      formData.append("message", `${file} to ${value} [skip ci]`);
      formData.append(file, doc.toString());

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
