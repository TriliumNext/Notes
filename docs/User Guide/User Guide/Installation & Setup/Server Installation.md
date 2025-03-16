# Server Installation
This guide outlines the steps to install Trilium on your own server. You might consider this option if you want to set up [synchronization](Synchronization.md) or use Trilium in a browser - accessible from anywhere.

## Installation Options

There are several ways to install Trilium on a server, each with its own advantages:

*   **Recommended**: [Docker Installation](Server%20Installation/1.%20Installing%20the%20server/Docker%20Server%20Installation.md) - Available for **AMD64** and **ARM** architectures.
*   [Packaged Server Installation](Server%20Installation/1.%20Installing%20the%20server/Packaged%20server%20installation.md)
*   [PikaPods managed hosting](https://www.pikapods.com/pods?run=trilium-next)
*   [Manual Installation](Server%20Installation/1.%20Installing%20the%20server/Manual%20server%20installation.md)
*   [Kubernetes](Server%20Installation/1.%20Installing%20the%20server/Kubernetes%20server%20installation.md)
*   [Cloudron](https://www.cloudron.io/store/com.github.trilium.cloudronapp.html)
*   [HomelabOS](https://homelabos.com/docs/software/trilium/)
*   [NixOS Module](Server%20Installation/1.%20Installing%20the%20server/NixOS%20server%20installation.md)

The server installation includes both web and [mobile frontends](Mobile%20Frontend.md).

## Configuration

After setting up your server installation, you may want to configure settings such as the port or enable [TLS](Server%20Installation/TLS%20Configuration.md). Configuration is managed via the Trilium `config.ini` file, which is located in the [data directory](Data%20directory.md) by default. To begin customizing your setup, copy the provided `config-sample.ini` file with default values to `config.ini`.

You can also review the [configuration](../Advanced%20Usage/Configuration%20\(config.ini%20or%20e.md) file to provide all `config.ini` values as environment variables instead.

### Config Location

By default, `config.ini`, the [database](../Advanced%20Usage/Database.md), and other important Trilium data files are stored in the [data directory](Data%20directory.md). If you prefer a different location, you can change it by setting the `TRILIUM_DATA_DIR` environment variable:

```
export TRILIUM_DATA_DIR=/home/myuser/data/my-trilium-data
```

### Disabling Authentication

If you are running Trilium on localhost only or if authentication is handled by another component, you can disable Trilium’s authentication by adding the following to `config.ini`:

```
[General]
noAuthentication=true
```

## Reverse Proxy Setup

To configure a reverse proxy for Trilium, you can use either **nginx** or **Apache**.

### nginx

Add the following configuration to your `nginx` setup to proxy requests to Trilium:

```
location /trilium/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

To avoid limiting the size of payloads, include this in the `server {}` block:

```
# Set to 0 for unlimited. Default is 1M.
client_max_body_size 0;
```

### Apache

For an Apache setup, refer to the [Apache proxy setup](Server%20Installation/2.%20Reverse%20proxy/Apache.md) guide.