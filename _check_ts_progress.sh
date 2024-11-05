#!/usr/bin/env bash

cd src/public
echo Summary
cloc HEAD \
    --git --md \
    --include-lang=javascript,typescript

echo By file
cloc HEAD \
    --git --md \
    --include-lang=javascript,typescript \
    --by-file