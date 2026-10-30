param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = $PSScriptRoot
if (-not $OutputPath) {
    $buildDirectory = Join-Path (Split-Path $projectRoot -Parent) '_builds'
    New-Item -ItemType Directory -Force -Path $buildDirectory | Out-Null
    $OutputPath = Join-Path $buildDirectory 'Colorfull_Cells.zip'
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
if (Test-Path -LiteralPath $OutputPath) {
    $directory = Split-Path $OutputPath -Parent
    $stem = [System.IO.Path]::GetFileNameWithoutExtension($OutputPath)
    $OutputPath = Join-Path $directory ($stem + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.zip')
}
$parent = Split-Path $OutputPath -Parent
New-Item -ItemType Directory -Force -Path $parent | Out-Null
# Explicit runtime directories: never enumerate mutable world data or server logs.
$files = @(Get-ChildItem -LiteralPath $projectRoot -File -Force | Where-Object { $_.Extension -notin @('.zip', '.log') })
foreach ($directory in @('assets', 'media', 'server', 'tests')) {
    $path = Join-Path $projectRoot $directory
    if (Test-Path -LiteralPath $path) {
        $files += Get-ChildItem -LiteralPath $path -File -Recurse -Force | Where-Object { $_.Extension -notin @('.zip', '.log') }
    }
}
$archive = [System.IO.Compression.ZipFile]::Open($OutputPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files) {
        $relative = $file.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
        $entry = $archive.CreateEntry($relative, [System.IO.Compression.CompressionLevel]::Optimal)
        # Shared reading also works if a development server has an asset open.
        $inputStream = [System.IO.File]::Open($file.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, ([System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete))
        try {
            $outputStream = $entry.Open()
            try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose() }
        } finally { $inputStream.Dispose() }
    }
} finally { $archive.Dispose() }
Write-Output $OutputPath