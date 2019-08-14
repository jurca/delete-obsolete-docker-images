# delete-obsolete-docker-images

A zero-dependency node.js script for easy deletion of all docker images of the
specified name from a registry.

## Usage

Modify the `API_ENDPOINT` variable in `delete-obsolete-docker-dev-images.js`
if needed to communicate with your docker registry.

```
node delete-obsolete-docker-dev-images.js docker-image-name
```
