#!/bin/bash
# Watchdog launcher for video_worker.py
# Starts the worker if it's not already running

WORKER_DIR="/Users/eug_fx/Documents/Orvex Systems/prospector/hermes-worker"
WORKER_SCRIPT="video_worker.py"
PIDFILE="${WORKER_DIR}/worker.pid"
LOGFILE="${WORKER_DIR}/worker.log"

cd "${WORKER_DIR}"

# Check if already running
if [ -f "${PIDFILE}" ]; then
    PID=$(cat "${PIDFILE}")
    if ps -p "${PID}" > /dev/null 2>&1; then
        # Still running — exit silently
        exit 0
    fi
fi

# Start the worker in background
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting video worker..." >> "${LOGFILE}"
nohup python3 -u "${WORKER_DIR}/${WORKER_SCRIPT}" >> "${LOGFILE}" 2>&1 &
echo $! > "${PIDFILE}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Worker started with PID $(cat "${PIDFILE}")" >> "${LOGFILE}"
