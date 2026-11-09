param(
    [Parameter(Mandatory)]
    [string]$WorkDirectory,
    [switch]$PublicCatalogue
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

$id = 'qrcode-barcode-scanner'
$version = '0.11.0'
$communitySource = 'https://community.chocolatey.org/api/v2/'
$publishedPackageSha = '481aed9c52d2c632bc755fedb42bdbaf05865c3d9e6801adffea9f7d91b78d5b'
$exeSha = '69381d512c72e0a5a2db8596e51a3d405eebd4f00a37a9e68faa2ed7b845531f'
$fixtureSha = 'c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8'
$work = (New-Item -ItemType Directory -Path $WorkDirectory -Force).FullName
$packages = Join-Path $work 'packages'
$client = ((& choco --version) -join "`n").Trim()

if ([Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne 'X64') {
    throw 'The qualification host must run x64 Windows.'
}
if ((Get-Command qrscan.exe -CommandType Application -ErrorAction SilentlyContinue) -or
    (& choco list $id --exact --limit-output)) {
    throw 'The qualification host already has a scanner installed.'
}

if ($PublicCatalogue) {
    $approvalUrl = "${communitySource}Packages(Id='$id',Version='$version')"
    [xml]$catalogue = (Invoke-WebRequest $approvalUrl -TimeoutSec 30 -MaximumRedirection 0).Content
    $namespaces = [System.Xml.XmlNamespaceManager]::new($catalogue.NameTable)
    $namespaces.AddNamespace('a', 'http://www.w3.org/2005/Atom')
    $namespaces.AddNamespace('m', 'http://schemas.microsoft.com/ado/2007/08/dataservices/metadata')
    $namespaces.AddNamespace('d', 'http://schemas.microsoft.com/ado/2007/08/dataservices')
    $status = $catalogue.SelectSingleNode('/a:entry/m:properties/d:PackageStatus', $namespaces).InnerText
    if ($catalogue.SelectSingleNode('/a:entry/a:title', $namespaces).InnerText -cne $id -or
        $catalogue.SelectSingleNode('/a:entry/m:properties/d:Version', $namespaces).InnerText -cne $version -or
        $catalogue.SelectSingleNode('/a:entry/m:properties/d:IsApproved', $namespaces).InnerText -cne 'true' -or
        $status -cne 'Approved') {
        throw "Chocolatey has not approved $id $version (status: $status)."
    }

    $listed = @(& choco search $id --exact --all-versions "--source=$communitySource" --limit-output)
    if ($listed -cnotcontains "$id|$version") {
        throw "Chocolatey search did not list $id $version on the public source."
    }

    New-Item -ItemType Directory -Path $packages -Force | Out-Null
    $publicArchive = Join-Path $packages "$id.$version.nupkg"
    Invoke-WebRequest "${communitySource}package/$id/$version" -TimeoutSec 60 -OutFile $publicArchive
    if ((Get-FileHash -LiteralPath $publicArchive -Algorithm SHA256).Hash -ine $publishedPackageSha) {
        throw 'Public Chocolatey package SHA-256 mismatch before installation.'
    }
}

$fixture = Join-Path $work 'mixed codes.png'
Invoke-WebRequest 'https://raw.githubusercontent.com/qrcode-ai-com/qrcode-barcode-scanner/176ac96ef16ee330dbfc6ada10327d0b4e23a8b2/fixtures/symbology/mixed-code128-qr.png' -OutFile $fixture
if ((Get-FileHash -LiteralPath $fixture -Algorithm SHA256).Hash -ine $fixtureSha) {
    throw 'Mixed-symbol fixture SHA-256 mismatch.'
}

$shim = Join-Path $env:ChocolateyInstall 'bin/qrscan.exe'
$installed = Join-Path $env:ChocolateyInstall "lib/$id"
if ($PublicCatalogue) {
    $installSource = $communitySource
    $receiptSource = $communitySource
    $packageArchive = Join-Path $installed "$id.nupkg"
}
else {
    $package = & (Join-Path $PSScriptRoot 'build.ps1') -OutputDirectory $packages
    $installSource = $package.DirectoryName
    $receiptSource = 'local-package'
    $packageArchive = $package.FullName
}

& choco install $id "--version=$version" "--source=$installSource" --yes --no-progress
try {
    $registered = ((& choco list $id --exact --limit-output) -join "`n").Trim()
    if ($registered -cne "$id|$version") { throw "Unexpected package registration: $registered" }

    $packageSha = (Get-FileHash -LiteralPath $packageArchive -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($PublicCatalogue -and $packageSha -cne $publishedPackageSha) {
        throw 'Installed Chocolatey package SHA-256 mismatch.'
    }

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

[ordered]@{
    package_id = $id
    package_version = $version
    package_sha256 = $packageSha
    source = $receiptSource
    chocolatey = $client
    os = [Runtime.InteropServices.RuntimeInformation]::OSDescription
    architecture = 'x64'
    executable_sha256 = $exeSha
    fixture_sha256 = $fixtureSha
    qrscan = $banner
    scan_profiles = @($results)
    uninstalled = $true
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $work 'receipt.json') -Encoding utf8
