@echo off
echo Starting the Express.js server and dist folder app...

:: Express szerver inditasa uj ablakban
start "Express Server" cmd /k "node server.js"

:: HTTP szerver inditasa a dist mappahoz uj ablakban
:: start "Dist Server" cmd /k "cd dist && http-server -p 8080"

:: echo Both servers are starting in separate windows...

echo The Express server is starting...
echo The dist folder app is starting...

:: Wait a bit for the server to start
timeout /t 3 /nobreak > nul

:: Get the local IP address of the computer
set "IP=localhost"
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%i
    goto :found_ip
)
:found_ip
:: Trim leading space
set IP=%IP:~1%

:: Use localhost if IP is not found or if IP is 1
if "%IP%"=="1" (
    set "IP=localhost"
)

:: Check if Firefox is installed
if exist "C:\Program Files\Mozilla Firefox\firefox.exe" (
    echo Firefox found, opening application with Firefox...
    start "" "C:\Program Files\Mozilla Firefox\firefox.exe" "http://%IP%:3003"
) else if exist "C:\Program Files (x86)\Mozilla Firefox\firefox.exe" (
    echo Firefox found, opening application with Firefox...
    start "" "C:\Program Files (x86)\Mozilla Firefox\firefox.exe" "http://%IP%:3003"
) else (
    echo Firefox not found, opening application with default browser...
    start "" "http://%IP%:3003"
)

echo Browser opened with the application URL: http://%IP%:3003
pause