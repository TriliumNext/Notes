# Using Docker
Official docker images are published on docker hub for **AMD64**, **ARMv7** and **ARM64/v8**: [https://hub.docker.com/r/triliumnext/notes/](https://hub.docker.com/r/triliumnext/notes/)

## Prerequisites

Ensure Docker is installed on your system.

If you need help installing Docker, reference the [Docker Installation Docs](https://docs.docker.com/engine/install/)

**Note:** Trilium's Docker container requires root privileges to operate correctly.

> [!WARNING]
> If you're using a SMB/CIFS share or folder as your Trilium data directory, [you'll need](https://github.com/TriliumNext/Notes/issues/415#issuecomment-2344824400) to add the mount options of `nobrl` and `noperm` when mounting your SMB share.

## Running with Docker Compose

### Grab the latest docker-compose.yml:

```
wget https://raw.githubusercontent.com/TriliumNext/Notes/master/docker-compose.yml
```

Optionally, edit the `docker-compose.yml` file to configure the container settings prior to starting it. Unless configured otherwise, the data directory will be `~/trilium-data` and the container will be accessible at port 8080.

### Start the container:

Run the following command to start the container in the background:

```
docker compose up -d
```

## Running without Docker Compose / Further Configuration

### Pulling the Docker Image

To pull the image, use the following command, replacing `[VERSION]` with the desired version or tag, such as `v0.91.6` or just `latest`. (See published tag names at [https://hub.docker.com/r/triliumnext/notes/tags](https://hub.docker.com/r/triliumnext/notes/tags).):

```
docker pull triliumnext/notes:v0.91.6
```

**Warning:** Avoid using the "latest" tag, as it may automatically upgrade your instance to a new minor version, potentially disrupting sync setups or causing other issues.

### Preparing the Data Directory

Trilium requires a directory on the host system to store its data. This directory must be mounted into the Docker container with write permissions.

### Running the Docker Container

#### Local Access Only

Run the container to make it accessible only from the localhost. This setup is suitable for testing or when using a proxy server like Nginx or Apache.

```
sudo docker run -t -i -p 127.0.0.1:8080:8080 -v ~/trilium-data:/home/node/trilium-data triliumnext/notes:[VERSION]
```

1.  Verify the container is running using `docker ps`.
2.  Access Trilium via a web browser at `127.0.0.1:8080`.

#### Local Network Access

To make the container accessible only on your local network, first create a new Docker network:

```
docker network create -d macvlan -o parent=eth0 --subnet 192.168.2.0/24 --gateway 192.168.2.254 --ip-range 192.168.2.252/27 mynet
```

Then, run the container with the network settings:

```
docker run --net=mynet -d -p 127.0.0.1:8080:8080 -v ~/trilium-data:/home/node/trilium-data triliumnext/notes:-latest
```

To set a different user ID (UID) and group ID (GID) for the saved data, use the `USER_UID` and `USER_GID` environment variables:

```
docker run --net=mynet -d -p 127.0.0.1:8080:8080 -e "USER_UID=1001" -e "USER_GID=1001" -v ~/trilium-data:/home/node/trilium-data triliumnext/notes:-latest
```

Find the local IP address using `docker inspect [container_name]` and access the service from devices on the local network.

```
docker ps
docker inspect [container_name]
```

#### Global Access

To allow access from any IP address, run the container as follows:

```
docker run -d -p 0.0.0.0:8080:8080 -v ~/trilium-data:/home/node/trilium-data triliumnext/notes:[VERSION]
```

Stop the container with `docker stop <CONTAINER ID>`, where the container ID is obtained from `docker ps`.

### Custom Data Directory

For a custom data directory, use:

```
-v ~/YourOwnDirectory:/home/node/trilium-data triliumnext/notes:[VERSION]
```

If you want to run your instance in a non-default way, please use the volume switch as follows: `-v ~/YourOwnDirectory:/home/node/trilium-data triliumnext/notes:<VERSION>`. It is important to be aware of how Docker works for volumes, with the first path being your own and the second the one to virtually bind to. [https://docs.docker.com/storage/volumes/](https://docs.docker.com/storage/volumes/) The path before the colon is the host directory, and the path after the colon is the container's path. More details can be found in the [Docker Volumes Documentation](https://docs.docker.com/storage/volumes/).

## Reverse Proxy

1.  [Nginx](../2.%20Reverse%20proxy/Nginx.md)
2.  [Apache](../2.%20Reverse%20proxy/Apache.md)

### Note on --user Directive

The `--user` directive is unsupported. Instead, use the `USER_UID` and `USER_GID` environment variables to set the appropriate user and group IDs.

### Note on timezones

If you are having timezone issues and you are not using docker-compose, you may need to add a `TZ` environment variable with the [TZ identifier](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) of your local timezone.