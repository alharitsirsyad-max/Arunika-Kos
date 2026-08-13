#!/bin/bash
cd "/home/abdul/Projects/Arunika kos/arunika-kos"
npm install date-fns > /tmp/npm_out.txt 2>&1
echo "NPM exit: $?" >> /tmp/npm_out.txt
cat /tmp/npm_out.txt
