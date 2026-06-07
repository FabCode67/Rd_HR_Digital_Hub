@echo off
REM Start the FastAPI server with Python 3.11
SET PY=C:\Users\ericn\AppData\Local\Programs\Python\Python311\python.exe
SET SCRIPTS=C:\Users\ericn\AppData\Local\Programs\Python\Python311\Scripts

echo [server] Running migrations...
%PY% migrate.py upgrade

echo [server] Starting uvicorn...
%SCRIPTS%\uvicorn.exe app.main:app --reload --port 8000
