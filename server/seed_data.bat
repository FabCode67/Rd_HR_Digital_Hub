@echo off
REM Seed bank HR data using Python 3.11
SET PY=C:\Users\ericn\AppData\Local\Programs\Python\Python311\python.exe

echo [seed] Installing python-dateutil ...
%PY% -m pip install python-dateutil --quiet --break-system-packages 2>nul || %PY% -m pip install python-dateutil --quiet

echo [seed] Running seed_data.py %*
%PY% seed_data.py %*
