# Nginx
Configure Nginx proxy and HTTPS. The operating system here is Ubuntu 18.04.

1.  Download Nginx and remove Apache2
    
    ```
    sudo apt-get install nginx
    sudo apt-get remove apache2
    ```
    
2.  Create configure file
    
    ```
    cd /etc/nginx/conf.d
    vim default.conf
    ```
    
3.  Fill the file with the context shown below, part of the setting show be changed. Then you can enjoy your web with HTTPS forced and proxy.
    
    ```
    # This part is for proxy and HTTPS configure
    server {
        listen 443 ssl;
        server_name trilium.example.net; #change trilium.example.net to your domain without HTTPS or HTTP.
        ssl_certificate /etc/ssl/note/example.crt; #change /etc/ssl/note/example.crt to your path of crt file.
        ssl_certificate_key /etc/ssl/note/example.net.key; #change /etc/ssl/note/example.net.key to your path of key file.
        ssl_session_cache builtin:1000 shared:SSL:10m;
        ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
        ssl_ciphers HIGH:!aNULL:!eNULL:!EXPORT:!CAMELLIA:!DES:!MD5:!PSK:!RC4;
        ssl_prefer_server_ciphers on;
        access_log /var/log/nginx/access.log; #check the path of access.log, if it doesn't fit your file, change it
        
        location / {
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_pass http://127.0.0.1:8080; # change it to a different port if non-default is used
            proxy_read_timeout 90;
            proxy_redirect http://127.0.0.1:8080 https://trilium.example.net; # change them based on your IP, port and domain
        }
    }
    # This part is for HTTPS forced
    server {
                listen 80;
                server_name trilium.example.net; # change to your domain
                return 301 https://$server_name$request_uri;
    }
    ```