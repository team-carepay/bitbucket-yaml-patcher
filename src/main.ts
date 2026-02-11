import * as core from "@actions/core";
import {
  ECRClient,
  BatchGetImageCommand,
  PutImageCommand,
} from "@aws-sdk/client-ecr";

export async function run(): Promise<void> {
  try {
    core.info(`Starting ECR retag action`);
    const repository: string = core.getInput("repository");
    const tag: string = core.getInput("tag");
    const newTag: string = core.getInput("newTag");

    await addEcrTag(repository, tag, newTag);
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}

async function addEcrTag(
  repositoryName: string,
  sourceTag: string,
  targetTag: string,
): Promise<void> {
  const ecr = new ECRClient();
  try {
    const getCommand = new BatchGetImageCommand({
      repositoryName,
      imageIds: [{ imageTag: sourceTag }],
    });
    const getResponse = await ecr.send(getCommand);

    if (
      !getResponse.images ||
      getResponse.images.length === 0 ||
      !getResponse.images[0].imageManifest
    ) {
      throw new Error(
        `Image with tag ${sourceTag} not found in repository ${repositoryName}`,
      );
    }
    core.info(`Successfully fetched image from ECR`);

    const putCommand = new PutImageCommand({
      repositoryName,
      imageManifest: getResponse.images[0].imageManifest,
      imageTag: targetTag,
    });

    await ecr.send(putCommand);
    core.info(
      `Successfully tagged image ${sourceTag} with ${targetTag} in repository ${repositoryName}`,
    );
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to tag ECR image: ${error.message}`);
    } else {
      core.setFailed("Unknown error during ECR tagging");
    }
  }
}
