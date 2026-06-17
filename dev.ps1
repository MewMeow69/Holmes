# Holmes GUI - Development Launch Script
# Requires: Node.js, Rust, VS Build Tools (MSVC)
# Run from project root in PowerShell.

$root = $PSScriptRoot

# Auto-detect MSVC toolchain via vswhere
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vswhere) {
    $vsPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($vsPath) {
        $vcTools = Get-ChildItem "$vsPath\VC\Tools\MSVC" -Directory | Sort-Object Name -Descending | Select-Object -First 1
        $sdk = Get-ChildItem "$vsPath\..\..\Windows Kits\10\Include" -Directory | Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } | Sort-Object Name -Descending | Select-Object -First 1
        if ($vcTools -and $sdk) {
            $env:Path = "$vcTools\bin\Hostx64\x64;$env:Path"
            $env:LIB = "$vcTools\lib\x64"
            $env:INCLUDE = "$vcTools\include;$sdk\ucrt;$sdk\um;$sdk\shared"
            Write-Output "MSVC auto-detected: $($vcTools.Name)"
        }
    }
}

if (-not $env:LIB) {
    Write-Warning "MSVC not auto-detected. Run from a Developer Command Prompt or install VS Build Tools."
}

Set-Location "$root\src-tauri"
npx tauri dev
