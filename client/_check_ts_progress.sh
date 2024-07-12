#!/usr/bin/env bash

cloc HEAD \
    --git --md \
    --include-lang=javascript,typescript \
    --found=filelist.txt \
    --exclude-dir=node_modules,libraries

grep -R \.js$ filelist.txt
rm filelist.txt