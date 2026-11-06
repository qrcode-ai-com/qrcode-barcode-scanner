# Win32_Processor architecture 9 identifies x64 hardware, including from a
# 32-bit PowerShell process. The release ships an x64 executable.
$processors = @(Get-CimInstance -ClassName Win32_Processor -ErrorAction Stop)
if (![Environment]::Is64BitOperatingSystem -or $processors.Count -eq 0 -or
    @($processors | Where-Object Architecture -NE 9).Count -ne 0) {
    throw 'QR Code & Barcode Scanner requires x64 Windows.'
}
