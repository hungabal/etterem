@echo off
echo Starting project update and build process...

:: Ellenőrizzük, hogy a Git elérhető-e
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: Git is not installed or not found in PATH. Please install Git.
    pause
    exit /b 1
)

:: Frissítjük a projektet a Git repository-ból
echo Restoring working directory changes...
git restore .
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to restore working directory. Check your Git installation.
    pause
    exit /b 1
)

echo Pulling latest changes from Git repository...
git pull origin master
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to pull from Git repository. Check your connection or repository settings.
    pause
    exit /b 1
)

:: Függőségek telepítése
echo Installing dependencies...
npm install
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to install dependencies. Check your package.json or npm installation.
    pause
    exit /b 1
)

:: Alkalmazás buildelése
echo Building the Vite/Vue application...
npm run build
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to build the application. Check your build configuration.
    pause
    exit /b 1
)

echo Project successfully updated and built! The dist folder is ready.
pause