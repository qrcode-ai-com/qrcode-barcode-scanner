param(
    [Parameter(Mandatory)]
    [string]$WorkDirectory,
    # local-package builds the package here and installs it from that directory.
    # community-feed installs the version the Chocolatey Community Repository serves.
    [ValidateSet('local-package', 'community-feed')]
    [string]$Source = 'local-package'
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

$id = 'qrcode-barcode-scanner'
$version = '0.11.0'
$exeSha = '69381d512c72e0a5a2db8596e51a3d405eebd4f00a37a9e68faa2ed7b845531f'
$fixtureSha = 'c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8'
$feed = 'https://community.chocolatey.org/api/v2/'
$work = (New-Item -ItemType Directory -Path $WorkDirectory -Force).FullName
$client = ((& choco --version) -join "`n").Trim()

if ([Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne 'X64') {
    throw 'The qualification host must run x64 Windows.'
}
if ((Get-Command qrscan.exe -CommandType Application -ErrorAction SilentlyContinue) -or
    (& choco list $id --exact --limit-output)) {
    throw 'The qualification host already has a scanner installed.'
}

$fixture = Join-Path $work 'mixed codes.png'
Invoke-WebRequest 'https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/176ac96ef16ee330dbfc6ada10327d0b4e23a8b2/fixtures/symbology/mixed-code128-qr.png' -OutFile $fixture
if ((Get-FileHash -LiteralPath $fixture -Algorithm SHA256).Hash -ine $fixtureSha) {
    throw 'Mixed-symbol fixture SHA-256 mismatch.'
}

$feedFacts = [ordered]@{}
if ($Source -eq 'community-feed') {
    # The feed's own record of this version: moderation status and the package hash it declares.
    [xml]$entry = (Invoke-WebRequest "${feed}Packages(Id='$id',Version='$version')").Content
    $status = $entry.SelectSingleNode("//*[local-name()='PackageStatus']").InnerText
    $declared = $entry.SelectSingleNode("//*[local-name()='PackageHash']").InnerText
    if ($status -cne 'Approved') { throw "The community feed reports the package status $status." }

    # One copy is downloaded for the receipt. Chocolatey installs from the feed, never from this copy.
    $packages = (New-Item -ItemType Directory -Path (Join-Path $work 'packages') -Force).FullName
    $download = Join-Path $packages "$id.$version.nupkg"
    Invoke-WebRequest "${feed}package/$id/$version" -OutFile $download
    $sha512 = [Convert]::ToBase64String([Security.Cryptography.SHA512]::HashData([IO.File]::ReadAllBytes($download)))
    if ($sha512 -cne $declared) { throw 'The downloaded package does not match the SHA-512 the community feed declares.' }
    $package = Get-Item -LiteralPath $download
    $installSource = $feed
    $feedFacts = [ordered]@{ feed = $feed; feed_package_status = $status; package_sha512_base64 = $sha512 }
}
else {
    $package = & (Join-Path $PSScriptRoot 'build.ps1') -OutputDirectory (Join-Path $work 'packages')
    $installSource = $package.DirectoryName
}
$shim = Join-Path $env:ChocolateyInstall 'bin/qrscan.exe'
$installed = Join-Path $env:ChocolateyInstall "lib/$id"
& choco install $id "--version=$version" "--source=$installSource" --yes --no-progress
try {
    $registered = ((& choco list $id --exact --limit-output) -join "`n").Trim()
    if ($registered -cne "$id|$version") { throw "Unexpected package registration: $registered" }

    $cli = (Get-Command qrscan.exe -CommandType Application).Source
    if ($cli -ine $shim) { throw "Expected Chocolatey shim, got $cli." }
    if ((Get-FileHash -LiteralPath (Join-Path $installed 'tools/qrscan.exe') -Algorithm SHA256).Hash -ine $exeSha) {
        throw 'Installed executable SHA-256 mismatch.'
    }

    $banner = ((& $cli --version) -join "`n").Trim()
    if ($banner -cne "qrscan $version") { throw "Unexpected scanner version: $banner" }

    $results = foreach ($profile in 'fast', 'frame', 'full') {
        $report = (& $cli $fixture --profile $profile --budget-ms 0) | ConvertFrom-Json
        $found = @($report.detections | ForEach-Object { "$($_.symbology):$($_.content.text)" })
        if ($report.versions.scanner -cne $version -or $report.trace.engine_panics -cne 0 -or
            $report.trace.budget_exhausted -cne $false -or $found.Count -ne 2 -or
            $found -cnotcontains 'qr_code:https://qrc-ai.com/76xMa' -or $found -cnotcontains 'code128:STOCK-4827') {
            throw "Unexpected $profile report: $($report | ConvertTo-Json -Depth 20 -Compress)"
        }
        [ordered]@{ profile = $profile; detections = $found }
    }
}
finally {
    & choco uninstall $id --yes --no-progress
}
if ((Test-Path -LiteralPath $installed) -or (Test-Path -LiteralPath $shim) -or
    (Get-Command qrscan.exe -CommandType Application -ErrorAction SilentlyContinue) -or
    (& choco list $id --exact --limit-output)) {
    throw 'Chocolatey uninstall left scanner files, a command or package registration.'
}

$receipt = [ordered]@{
    package_id = $id
    package_version = $version
    package_sha256 = (Get-FileHash -LiteralPath $package.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    source = $Source
    chocolatey = $client
    os = [Runtime.InteropServices.RuntimeInformation]::OSDescription
    architecture = 'x64'
    executable_sha256 = $exeSha
    fixture_sha256 = $fixtureSha
    qrscan = $banner
    scan_profiles = @($results)
    uninstalled = $true
}
foreach ($fact in $feedFacts.GetEnumerator()) { $receipt[$fact.Key] = $fact.Value }
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $work 'receipt.json') -Encoding utf8
