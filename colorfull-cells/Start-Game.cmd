@echo off
cd /d "%~dp0"
echo Open http://localhost:1212 after the server starts.
node server/index.js
pause
