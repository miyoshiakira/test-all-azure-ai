param(
    [Parameter(Mandatory=$true)][string]$ZipFile,
    [string]$OutDir
)

if (-not (Test-Path $ZipFile)) {
    Write-Host "ERROR: File not found: $ZipFile" -ForegroundColor Red
    exit 1
}

if (-not $OutDir) {
    $OutDir = [System.IO.Path]::GetFileNameWithoutExtension($ZipFile) + "_flat"
}

Write-Host "============================================================"
Write-Host "  ZIP Flatten Utility"
Write-Host "============================================================"
Write-Host "  Input : $ZipFile"
Write-Host "  Output: $OutDir"
Write-Host ""

if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$tempDir = Join-Path $env:TEMP "flatten_zip_$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "[1/2] Extracting ZIP..."
Expand-Archive -Path $ZipFile -DestinationPath $tempDir -Force

Write-Host "[2/2] Flattening files..."
$fileCount = 0
$conflictCount = 0

$allFiles = Get-ChildItem -Path $tempDir -Recurse -File

foreach ($file in $allFiles) {
    $destPath = Join-Path $OutDir $file.Name

    if (Test-Path $destPath) {
        $conflictCount++
        $base = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
        $ext = [System.IO.Path]::GetExtension($file.Name)
        $idx = 1
        while (Test-Path (Join-Path $OutDir ("${base}_(${idx})${ext}"))) {
            $idx++
        }
        $newName = "${base}_(${idx})${ext}"
        $destPath = Join-Path $OutDir $newName
        Write-Host "  [conflict] $($file.Name) -> $newName"
    } else {
        Write-Host "  [copied] $($file.Name)"
    }

    Copy-Item -Path $file.FullName -Destination $destPath -Force
    $fileCount++
}

Remove-Item -Path $tempDir -Recurse -Force

Write-Host ""
Write-Host "============================================================"
Write-Host "  Done!"
Write-Host "  Files: $fileCount"
Write-Host "  Conflicts (renamed): $conflictCount"
Write-Host "  Output: $OutDir"
Write-Host "============================================================"