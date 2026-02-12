# File Xplor Rebrand Script
# Run from your project root: cd ~/Desktop/xplor; powershell -ExecutionPolicy Bypass -File rebrand.ps1

$files = @(
    "components/LandingPage.js",
    "components/AuthScreen.js",
    "components/ProjectsDashboard.js",
    "components/Explorer.js",
    "app/layout.js",
    "app/page.js",
    "README.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace 'PDF Explorer', 'File Xplor'
        $content = $content -replace 'pdf-explorer', 'file-xplor'
        Set-Content $file $content -NoNewline
        Write-Host "Updated: $file" -ForegroundColor Green
    } else {
        Write-Host "Not found: $file" -ForegroundColor Yellow
    }
}

# Fix package.json
if (Test-Path "package.json") {
    $pkg = Get-Content "package.json" -Raw
    $pkg = $pkg -replace '"pdf-explorer"', '"file-xplor"'
    Set-Content "package.json" $pkg -NoNewline
    Write-Host "Updated: package.json" -ForegroundColor Green
}

Write-Host "`nDone! All files rebranded to File Xplor." -ForegroundColor Cyan
Write-Host "Now run:" -ForegroundColor Cyan
Write-Host "  git add ." -ForegroundColor White
Write-Host "  git commit -m 'Rebrand to File Xplor'" -ForegroundColor White
Write-Host "  git push" -ForegroundColor White
Write-Host "  npx vercel --prod" -ForegroundColor White
