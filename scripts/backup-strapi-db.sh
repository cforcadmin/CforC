#!/bin/bash
# Wrapper for cron — runs the Node.js backup script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
/Users/yoryosstyl/miniconda3/bin/node "$SCRIPT_DIR/backup-strapi-db.js" 2>&1
