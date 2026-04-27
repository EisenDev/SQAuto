#!/bin/bash

# Configuration
SOURCE_DIR="/home/eisen/.gemini/antigravity"
BACKUP_PARENT_DIR="/home/eisen/Downloads/SQAuto/history_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_PARENT_DIR}/backup_${TIMESTAMP}"

echo "Starting Antigravity History Backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Copy conversations and brain data
if [ -d "$SOURCE_DIR" ]; then
    echo "Copying data from $SOURCE_DIR..."
    cp -r "$SOURCE_DIR/conversations" "$BACKUP_DIR/"
    cp -r "$SOURCE_DIR/brain" "$BACKUP_DIR/"
    cp "$SOURCE_DIR/installation_id" "$BACKUP_DIR/" 2>/dev/null
    
    echo "Backup completed successfully at $BACKUP_DIR"
    
    # Create a 'latest' symlink
    rm -f "${BACKUP_PARENT_DIR}/latest"
    ln -s "$BACKUP_DIR" "${BACKUP_PARENT_DIR}/latest"
    
    # Verify
    echo "Total backup size:"
    du -sh "$BACKUP_DIR"
else
    echo "Error: Source directory $SOURCE_DIR not found!"
    exit 1
fi

echo "Done."
