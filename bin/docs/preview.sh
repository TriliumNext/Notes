#!/usr/bin/env bash

LISTEN_ADDRESS=127.0.0.1:8088

script_dir=$(realpath $(dirname $0))
output_dir="$script_dir/../../docs"
echo "Preview the documentation at http://$LISTEN_ADDRESS"
httpd -fv -p "$LISTEN_ADDRESS" -h "$output_dir"