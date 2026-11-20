# Loads the Portfile with stand-in MacPorts commands, without MacPorts: every option it sets is
# recorded, and its test phase runs against a stand-in qrscan, so the Tcl is executed, not only
# parsed. It proves nothing about a real `port install`; see README.md for that run.
#
#   tclsh distribution/macports/test-portfile.tcl
set here [file dirname [file normalize [info script]]]
set portfile [file join $here graphics qrcode-barcode-scanner Portfile]
set failures 0
proc fail {message} { puts "FAIL $message"; incr ::failures }

set ::options [dict create]
proc PortSystem {args} {}
proc PortGroup {args} {}
foreach option {name version revision categories installs_libs license maintainers description
        long_description homepage master_sites distname conflicts checksums-append
        build.args-append test.run livecheck.type livecheck.url livecheck.regex cargo.crates} {
    # An option sets the variable of its name, as MacPorts does, and is recorded.
    proc $option {args} "dict set ::options $option \$args; set ::$option \[join \$args\]"
}
proc cargo.rust_platform {} { return aarch64-apple-darwin }
proc test {body} { set ::test_body $body }
proc destroot {body} { set ::destroot_body $body }
set box [file join [expr {[info exists ::env(TMPDIR)] ? $::env(TMPDIR) : "/tmp"}] qrscan-portfile-[pid]]
set worksrcpath $box
set destroot $box/destroot
set prefix /opt/local
set extract.suffix .tar.gz
source $portfile

proc option {key} { return [join [dict get $::options $key]] }
foreach {key want} {name qrcode-barcode-scanner version 0.11.0 license AGPL-3+ conflicts qrscan
        categories graphics build.args-append {-p qrcode-barcode-scanner-cli}} {
    if {[option $key] ne $want} { fail "$key is [option $key], not $want" }
}
if {![string match https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/releases/download/v0.11.0/ [option master_sites]]} {
    fail "master_sites is not the v0.11.0 release download"
}
if {[option distname] ne "qrcode-barcode-scanner-cli-0.11.0-source"} { fail "distname is [option distname]" }
set crates [join [dict get $::options cargo.crates]]
if {[llength $crates] % 3 != 0} { fail "cargo.crates is not a list of name, version, checksum" }
foreach {crate release checksum} $crates {
    if {![regexp {^[0-9a-f]{64}$} $checksum]} { fail "$crate $release has no SHA-256 checksum" }
}
puts "ok   options: [dict size $::options], crates: [expr {[llength $crates] / 3}]"

file mkdir $box
set stub [file join $box qrscan]
proc stand_in {lines} {
    set f [open $::stub w]
    puts $f "#!/bin/sh"
    foreach line $lines { puts $f "printf '%s\\n' '$line'" }
    close $f
    file attributes $::stub -permissions 0755
}
set qrscan_bin $stub
stand_in {{"text": "https://qrc-ai.com/76xMa"} {"text": "STOCK-4827"}}
if {[catch {eval $test_body} message]} { fail "the test phase refused both payloads: $message" } else { puts "ok   the test phase passes when both payloads are read" }
stand_in {{"text": "STOCK-4827"}}
if {[catch {eval $test_body} message]} { puts "ok   the test phase refuses a missing QR payload" } else { fail "the test phase passed without the QR payload" }
file delete -force $box
if {$failures} { exit 1 }
puts "portfile: checks passed"
