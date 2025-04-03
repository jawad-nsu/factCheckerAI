@echo off
echo Preparing extension for Firefox...
echo.

REM Rename the manifest files temporarily
ren manifest.json manifest-chrome.json
ren manifest-firefox.json manifest.json

echo Manifest files renamed successfully!
echo.
echo Now you can load the extension in Firefox:
echo 1. Open Firefox
echo 2. Go to about:debugging
echo 3. Click "This Firefox" in the left sidebar
echo 4. Click "Load Temporary Add-on"
echo 5. Navigate to this directory
echo 6. Select the "manifest.json" file
echo.
echo After loading, run restore-manifests.bat to restore the original filenames.
echo.
echo Press any key to continue...
pause > nul 