@echo off
setlocal
cd /d "%~dp0"
python host_ollama.py %*
