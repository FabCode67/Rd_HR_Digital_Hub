@echo off
REM Seed the admin user — run once after clearing the database
SET PY=C:\Users\ericn\AppData\Local\Programs\Python\Python311\python.exe

echo [seed] Seeding admin user...
%PY% seed_admin.py %*
