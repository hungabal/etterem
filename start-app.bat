@echo off
echo Starting the Express.js server and dist folder app...

:: Express szerver inditasa uj ablakban
start "Express Server" cmd /k "node server.js"

:: HTTP szerver inditasa a dist mappahoz uj ablakban
:: start "Dist Server" cmd /k "cd dist && http-server -p 8080"

:: echo Both servers are starting in separate windows...

echo The Express server is starting...
echo The dist folder app is starting...
pause