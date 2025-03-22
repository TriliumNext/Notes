# ETAPI (REST API)
ETAPI is Trilium's public/external REST API. It is available since Trilium v0.50.

The documentation is in OpenAPI format, available [here](https://github.com/TriliumNext/Notes/blob/master/src/etapi/etapi.openapi.yaml).

[trilium-py](https://github.com/Nriver/trilium-py) is a third-party Python implementation for ETAPI client, you can use Python to communicate with Trilium.

## Authentication

All operations have to be authenticated using a token. You can get this token either from Options -> ETAPI or programmatically using the `/auth/login` REST call (see the [spec](https://github.com/TriliumNext/Notes/blob/master/src/etapi/etapi.openapi.yaml)):

```
GET https://myserver.com/etapi/app-info
Authorization: ETAPITOKEN
```

Alternatively, since 0.56 you can also use basic auth format:

```
GET https://myserver.com/etapi/app-info
Authorization: Basic BATOKEN
```

*   Where `BATOKEN = BASE64(username + ':' + password)` - this is a standard Basic Auth serialization
*   Where `username` is "etapi"
*   And `password` is the generated ETAPI token described above.

Basic Auth is meant to be used with tools which support only basic auth.