$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
if (!$env:RUNNER_TEMP -or [Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne 'X64') {
    throw 'Use a disposable Windows x64 runner.'
}

$id = 'QRCodeAI.QRCodeBarcodeScanner'
$scannerVersion = '0.11.0'
$clientVersion = '1.29.380'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$manifest = Join-Path $root "distribution/winget/manifests/q/QRCodeAI/QRCodeBarcodeScanner/$scannerVersion"
$work = Join-Path $env:RUNNER_TEMP 'WinGet consumer'
New-Item -ItemType Directory -Path $work -Force | Out-Null

$appInstaller = 'Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle'
$archive = 'DesktopAppInstaller_Dependencies.zip'
$clientAssets = @{
    $appInstaller = '65dea9c01ce08ee7b763366b27c0e651f97db857c11ca9b9c301826c10092f2e'
    $archive = 'ba875afe9d190f61218985ac0292a99d1db710bf93e13c68944ca9d89f0d82d1'
}
foreach ($name in $clientAssets.Keys) {
    $download = Join-Path $work $name
    Invoke-WebRequest "https://github.com/microsoft/winget-cli/releases/download/v$clientVersion/$name" -OutFile $download
    if ((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash -ine $clientAssets[$name]) {
        throw "App Installer asset SHA-256 mismatch: $name"
    }
}
Expand-Archive -LiteralPath (Join-Path $work $archive) -DestinationPath (Join-Path $work 'dependencies')
$env:QRSCAN_APPINSTALLER_BUNDLE = Join-Path $work $appInstaller
$env:QRSCAN_APPINSTALLER_X64 = Join-Path $work 'dependencies/x64'
$winget = (& powershell.exe -NoProfile -NonInteractive -Command {
    $ErrorActionPreference = 'Stop'
    $dependencies = @(Get-ChildItem -LiteralPath $env:QRSCAN_APPINSTALLER_X64 -File -Filter '*.appx')
    if ($dependencies.Count -ne 3) { throw 'The pinned App Installer bundle expects three x64 dependencies.' }
    Add-AppxPackage -Path $env:QRSCAN_APPINSTALLER_BUNDLE -DependencyPath $dependencies.FullName
    $package = Get-AppxPackage -Name Microsoft.DesktopAppInstaller
    Join-Path $package.InstallLocation 'winget.exe'
} | Select-Object -Last 1)
$actualClient = ((& $winget --version) -join "`n").Trim()
if ($actualClient -cne "v$clientVersion") { throw "Expected WinGet v$clientVersion, got $actualClient." }
if (Get-Command qrscan.exe -CommandType Application -ErrorAction SilentlyContinue) {
    throw 'The consumer already has a qrscan executable.'
}

# This setting applies only inside the disposable Windows test host.
& $winget settings --enable LocalManifestFiles
# The local manifest has no Microsoft Store dependency. Limit discovery to WinGet.
& $winget source remove --name msstore --disable-interactivity
& $winget validate --manifest $manifest
& $winget install --manifest $manifest --scope user --architecture x64 --silent --disable-interactivity

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$env:PATH = "$userPath;$env:PATH"
$cli = (Get-Command qrscan.exe -CommandType Application).Source
$winGetRoot = Join-Path $env:LOCALAPPDATA 'Microsoft/WinGet'
if (!$cli.StartsWith($winGetRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Unexpected installed executable: $cli"
}
$banner = ((& $cli --version) -join "`n").Trim()
if ($banner -cne "qrscan $scannerVersion") { throw "Unexpected scanner version: $banner" }

$fixture = Join-Path $work 'mixed codes.png'
$fixtureSha = 'c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8'
Invoke-WebRequest 'https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/176ac96ef16ee330dbfc6ada10327d0b4e23a8b2/fixtures/symbology/mixed-code128-qr.png' -OutFile $fixture
if ((Get-FileHash -LiteralPath $fixture -Algorithm SHA256).Hash -ine $fixtureSha) {
    throw 'Mixed-symbol fixture SHA-256 mismatch.'
}
$results = foreach ($profile in 'fast', 'frame', 'full') {
    $report = (& $cli $fixture --profile $profile --budget-ms 0) | ConvertFrom-Json
    $found = @($report.detections | ForEach-Object { "$($_.symbology):$($_.content.text)" })
    if ($report.versions.scanner -cne $scannerVersion -or $report.trace.engine_panics -ne 0 -or
        $report.trace.budget_exhausted -cne $false -or $found.Count -ne 2 -or
        $found -cnotcontains 'qr_code:https://qrc-ai.com/76xMa' -or $found -cnotcontains 'code128:STOCK-4827') {
        throw "Unexpected $profile report: $($report | ConvertTo-Json -Depth 20 -Compress)"
    }
    [ordered]@{ profile = $profile; detections = $found }
}
& $winget uninstall --manifest $manifest --scope user --silent --disable-interactivity --purge
if ((Test-Path -LiteralPath $cli) -or (Get-Command qrscan.exe -CommandType Application -ErrorAction SilentlyContinue)) {
    throw 'WinGet uninstall left the scanner command on PATH.'
}

$manifestHashes = [ordered]@{}
foreach ($file in Get-ChildItem -LiteralPath $manifest -File -Filter '*.yaml' | Sort-Object Name) {
    $bytes = [Text.Encoding]::UTF8.GetBytes([IO.File]::ReadAllText($file.FullName).Replace("`r`n", "`n"))
    $manifestHashes[$file.Name] = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}
[ordered]@{
    package_id = $id
    client = $actualClient
    platform = 'windows-x64'
    scope = 'user'
    source = 'local-manifest'
    manifest_sha256_lf = $manifestHashes
    qrscan = $banner
    scan_profiles = @($results)
    uninstalled = $true
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $env:RUNNER_TEMP 'winget-consumer-receipt.json') -Encoding utf8
