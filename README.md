# Bitbucket YAML Patcher

This GitHub Action allows you to patch YAML files hosted in a Bitbucket repository. It fetches the file, updates a specific value using JSONPath, and commits the change back to the repository.

## Inputs

| Input        | Description                                                                                               | Required | Default                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| `file`       | The path to the YAML file to patch (e.g., `ken-test/applications/default/security/ussd/values.yaml`).     | **Yes**  |                                                                        |
| `value`      | The new value to set.                                                                                     | **Yes**  | Defaults to the tag name if it's a tag push, otherwise the commit SHA. |
| `username`   | The Username for authentication with Bitbucket. This will also be the username that will make the commit. | **Yes**  | `carepaybot`                                                           |
| `password`   | The Password or App Password for authentication with Bitbucket.                                           | **Yes**  |                                                                        |
| `jsonpath`   | The JSONPath expression to locate the value to update.                                                    | **Yes**  | `$.microservice.image`                                                 |
| `workspace`  | The Bitbucket workspace slug.                                                                             | **Yes**  | `carepaydev`                                                           |
| `repository` | The Bitbucket repository slug.                                                                            | **Yes**  | `central-configs`                                                      |

## Usage Example

```yaml
name: Update Image Version

on:
  push:
    tags:
      - "v*"

jobs:
  update-bitbucket:
    runs-on: ubuntu-latest
    steps:
      - name: Patch Values YAML
        uses: carepay/bitbucket-yaml-patcher@v1
        with:
          file: "path/to/values.yaml"
          value: "v1.2.3"
          username: "my-bitbucket-user"
          password: ${{ secrets.BITBUCKET_PASSWORD }}
          jsonpath: "$.image.tag"
          workspace: "my-workspace"
          repository: "my-repo"
```

## Development

To build the action for distribution:

```bash
npm run bundle
```

This command runs the formatter and packages the TypeScript code into a single JavaScript file in the `dist` folder.

Since most project will use the 'major' version number only, it's recommended to 'move' the v1 tag to the latest version number:

```bash
git tag v1 --force
git push --tags --force
```
