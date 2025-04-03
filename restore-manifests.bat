@echo off
echo Restoring original manifest filenames...
echo.

REM Restore the original filenames
ren manifest.json manifest-firefox.json
ren manifest-chrome.json manifest.json

echo Manifest files restored successfully!
echo.
echo Press any key to continue...
pause > nul 