// Destination acceptance, Go package: scan one image with the three profiles through the
// installed package and write one JSON report per profile, for
// `scripts/destination-acceptance.py reports` to judge.
//
//	go run . IMAGE OUT_DIR [QRSCAN]
//
// Copy this file as main.go into the module that required the package, then run it there.
// QRSCAN is the installed command, `qrscan` on PATH by default. Each file is the text the
// command printed, unchanged. This program judges nothing.
package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	qrscan "github.com/qrcode-ai-com/qrcode-barcode-scanner-go"
)

func main() {
	if len(os.Args) < 3 || len(os.Args) > 4 {
		fmt.Fprintln(os.Stderr, "usage: go run . IMAGE OUT_DIR [QRSCAN]")
		os.Exit(2)
	}
	image, out, binary := os.Args[1], os.Args[2], ""
	if len(os.Args) == 4 {
		binary = os.Args[3]
	}
	if err := os.MkdirAll(out, 0o755); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	scanner := qrscan.New(binary)
	for _, profile := range []qrscan.Profile{qrscan.Fast, qrscan.Frame, qrscan.Full} {
		report, err := scanner.Scan(context.Background(), image, profile, qrscan.Unbounded)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		if err := os.WriteFile(filepath.Join(out, string(profile)+".json"), report.JSON, 0o644); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		found := []string{}
		for _, detection := range report.Detections {
			found = append(found, detection.Symbology+":"+detection.Text)
		}
		fmt.Println(profile, strings.Join(found, " "))
	}
}
