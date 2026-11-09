param([switch]$PublicCatalogue)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
if (!$IsWindows -or !$env:RUNNER_TEMP -or [Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne 'X64') {
    throw 'Use a disposable Windows x64 runner.'
}

$id = 'QRCodeAI.QRCodeBarcodeScanner'
$scannerVersion = '0.11.0'
$clientVersion = '1.29.380'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$manifest = Join-Path $root "distribution/winget/manifests/q/QRCodeAI/QRCodeBarcodeScanner/$scannerVersion"
$work = Join-Path $env:RUNNER_TEMP 'WinGet consumer'
New-Item -ItemType Directory -Path $work -Force | Out-Null

function Confirm-PublicCatalogue {
    $source = & $winget source export --name winget --disable-interactivity | ConvertFrom-Json
    if ($source.Name -cne 'winget' -or $source.Arg -cne $sourceUrl -or
        $source.Type -cne 'Microsoft.PreIndexed.Package' -or
        $source.Identifier -cne 'Microsoft.Winget.Source_8wekyb3d8bbwe') {
        throw 'The configured winget source is not the Microsoft community catalogue.'
    }
    & $winget source update --name winget --disable-interactivity
    $listing = (& $winget show @publicPackage --scope user --architecture x64 --accept-source-agreements --disable-interactivity) -join "`n"
    $expectedId = [regex]::Escape($id)
    $expectedVersion = [regex]::Escape($scannerVersion)
    $expectedUrl = [regex]::Escape($installerUrl)
    if ($listing -cnotmatch "(?m)\[$expectedId\][ \t]*$" -or
        $listing -cnotmatch "(?m)^Version: $expectedVersion[ \t]*$" -or
        $listing -cnotmatch "(?m)^\s*Installer Url: $expectedUrl[ \t]*$" -or
        $listing -notmatch "(?m)^\s*Installer SHA256: $installerSha[ \t]*$") {
        throw "The public catalogue did not report the pinned $id $scannerVersion Windows x64 installer."
    }
    $installer = Join-Path $work 'scanner-windows-x64.zip'
    Invoke-WebRequest $installerUrl -TimeoutSec 60 -OutFile $installer
    if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash -ine $installerSha) {
        throw 'The public WinGet installer SHA-256 does not match the qualified release.'
    }
    $listing | Set-Content -LiteralPath (Join-Path $env:RUNNER_TEMP 'winget-catalogue-listing.txt') -Encoding utf8
}

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

if ($PublicCatalogue) {
    $sourceUrl = 'https://cdn.winget.microsoft.com/cache'
    $installerUrl = 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner/releases/download/v0.11.0/qrcode-barcode-scanner-cli-0.11.0-x86_64-pc-windows-msvc.zip'
    $installerSha = '6c8771c2d225abb7b4ce75f073a86aa118bf6537f6824706628b81584a81ede7'
    $executableSha = '69381d512c72e0a5a2db8596e51a3d405eebd4f00a37a9e68faa2ed7b845531f'
    $publicPackage = @('--id', $id, '--exact', '--version', $scannerVersion, '--source', 'winget')
    Confirm-PublicCatalogue
    & $winget install @publicPackage --scope user --architecture x64 --silent --accept-source-agreements --accept-package-agreements --disable-interactivity
}
else {
    # These settings apply only inside the disposable local-manifest test host.
    & $winget settings --enable LocalManifestFiles
    & $winget source remove --name msstore --disable-interactivity
    & $winget validate --manifest $manifest
    & $winget install --manifest $manifest --scope user --architecture x64 --silent --disable-interactivity
}

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$env:PATH = "$userPath;$env:PATH"
$cli = (Get-Command qrscan.exe -CommandType Application).Source
$winGetRoot = Join-Path $env:LOCALAPPDATA 'Microsoft/WinGet'
if (!$cli.StartsWith($winGetRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Unexpected installed executable: $cli"
}
if ($PublicCatalogue -and (Get-FileHash -LiteralPath $cli -Algorithm SHA256).Hash -ine $executableSha) {
    throw 'The installed qrscan executable SHA-256 does not match the qualified release.'
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
$registration = @(Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall' |
    Get-ItemProperty |
    Where-Object { $_.WinGetPackageIdentifier -ceq $id -and $_.DisplayVersion -ceq $scannerVersion })
if ($registration.Count -ne 1) { throw "Expected exactly one portable WinGet registration for $id." }
# Use the exact portable product registration for both install modes.
& $winget uninstall --product-code $registration[0].PSChildName --scope user --silent --disable-interactivity --purge
if (Test-Path -LiteralPath $registration[0].PSPath) { throw 'WinGet uninstall left its portable registration.' }
if ((Test-Path -LiteralPath $cli) -or (Get-Command qrscan.exe -CommandType Application -ErrorAction SilentlyContinue)) {
    throw 'WinGet uninstall left the scanner command on PATH.'
}

$receipt = [ordered]@{
    package_id = $id
    package_version = $scannerVersion
    client = $actualClient
    platform = 'windows-x64'
    scope = 'user'
    qrscan = $banner
    fixture_sha256 = $fixtureSha
    scan_profiles = @($results)
    uninstalled = $true
}
if ($PublicCatalogue) {
    $receipt.source = 'winget'
    $receipt.source_url = $sourceUrl
    $receipt.installer_url = $installerUrl
    $receipt.installer_sha256 = $installerSha
    $receipt.executable_sha256 = $executableSha
}
else {
    $receipt.source = 'local-manifest'
    $receipt.manifest_sha256_lf = [ordered]@{}
    foreach ($file in Get-ChildItem -LiteralPath $manifest -File -Filter '*.yaml' | Sort-Object Name) {
        $bytes = [Text.Encoding]::UTF8.GetBytes([IO.File]::ReadAllText($file.FullName).Replace("`r`n", "`n"))
        $receipt.manifest_sha256_lf[$file.Name] = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
    }
}
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $env:RUNNER_TEMP 'winget-consumer-receipt.json') -Encoding utf8
