// SPDX-License-Identifier: AGPL-3.0-or-later

// Package qrscan reads QR codes and barcodes from an image file through the installed qrscan
// command of the QR Code & Barcode Scanner engine.
//
// The package holds no decoder. It starts the command, which you install separately, and
// returns its JSON report unchanged. One scan is one process. The command is started from a
// list of arguments, with no shell: a file name is never interpreted, whatever it holds. The
// package uses the standard library only, with no cgo.
//
//	scanner := qrscan.New("") // qrscan on PATH
//	report, err := scanner.Scan(ctx, "label.png", qrscan.Fast, qrscan.ProfileBudget)
//	for _, detection := range report.Detections {
//		fmt.Println(detection.Symbology, detection.Text)
//	}
package qrscan

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"sync"
)

// SupportedEngine is the engine line this package was checked against: every 0.11.x.
const SupportedEngine = "0.11"

// Profile says how much work one scan does. The values are the ones `qrscan --profile` takes.
type Profile string

const (
	// Full decodes and judges how well a QR code scans.
	Full Profile = "full"
	// Fast decodes first, with a reduced judgment.
	Fast Profile = "fast"
	// Frame decodes only: the report carries no score.
	Frame Profile = "frame"
)

// A time budget for the engine, in milliseconds.
const (
	// ProfileBudget keeps the profile's own budget.
	ProfileBudget = -1
	// Unbounded sets no budget: the result then does not depend on how busy the machine is.
	Unbounded = 0
)

// ErrBinaryNotFound means the qrscan command could not be started: it is not installed, not on
// PATH or not executable.
var ErrBinaryNotFound = errors.New("qrscan: the qrscan command could not be started")

// UnsupportedVersionError means the installed qrscan is not a version this package was checked
// against.
type UnsupportedVersionError struct {
	// Version is what the command reported, empty when it reported none.
	Version string
}

func (e *UnsupportedVersionError) Error() string {
	version := e.Version
	if version == "" {
		version = "unknown"
	}
	return fmt.Sprintf("qrscan: the installed qrscan is version %s; this package supports %s.x", version, SupportedEngine)
}

// ScanError means the engine refused the file or the options, or its output could not be read.
type ScanError struct {
	// ExitCode is the command's exit code.
	ExitCode int
	// EngineCode is the engine's own code, such as QRS-001 for a file that is not an image.
	// It is empty when the message carries none.
	EngineCode string
	// Message is one line of the command's own message.
	Message string
}

func (e *ScanError) Error() string { return "qrscan: the scan was refused: " + e.Message }

// Detection is one decoded content. The full entry, with its payload and measured places, is
// in Report.JSON.
type Detection struct {
	// Symbology is the kind of code, such as qr_code or code128.
	Symbology string
	// Text is the decoded text. Treat it as untrusted data: a QR code can hold any text.
	Text string
	// Raw is the exact bytes of the content, for content that is not text.
	Raw []byte
}

// Score is the scannability judgment of a QR code.
type Score struct {
	// Value is the composite score, from 0 to 100.
	Value int
}

// Report is one scan report. JSON is the text the engine printed, unchanged: nothing is
// renamed, rounded or recalculated. The other fields only read it. A report with no detection
// is a valid result, not an error.
type Report struct {
	// JSON is the engine's report, exactly as printed.
	JSON []byte
	// ExitCode is 0 when qrscan found a code and 1 when it found none.
	ExitCode int
	// Detections holds one entry per distinct content.
	Detections []Detection
	// Score is nil when the engine made no judgment: the frame profile, or a budget that ran
	// out. Nil is never zero.
	Score *Score
	// Complete is false when the time budget cut the scan: an empty report then proves nothing.
	Complete bool
	// EngineVersion is the engine that wrote the report, such as 0.11.0.
	EngineVersion string
}

// Found reports whether at least one code was decoded.
func (r *Report) Found() bool { return len(r.Detections) > 0 }

// Scanner starts one qrscan command. It is safe for concurrent use.
type Scanner struct {
	binary string
	// What `qrscan --capabilities` answered, kept once the command has answered.
	mu           sync.Mutex
	probed       bool
	capabilities []byte
	version      string
	failure      error
}

// New returns a Scanner for the given command: a name looked up on PATH or a path. An empty
// name means "qrscan".
func New(binary string) *Scanner {
	if binary == "" {
		binary = "qrscan"
	}
	return &Scanner{binary: binary}
}

// Scan reads the codes of one image file (PNG, JPEG, WebP or GIF). budgetMs is ProfileBudget,
// Unbounded or a number of milliseconds. Cancelling ctx stops the command.
func (s *Scanner) Scan(ctx context.Context, imagePath string, profile Profile, budgetMs int) (*Report, error) {
	if imagePath == "" || strings.ContainsRune(imagePath, 0) {
		return nil, errors.New("qrscan: the image path must be a file path")
	}
	if profile != Full && profile != Fast && profile != Frame {
		return nil, fmt.Errorf("qrscan: unknown profile %q", profile)
	}
	if budgetMs < ProfileBudget {
		return nil, errors.New("qrscan: the budget is ProfileBudget, Unbounded or a number of milliseconds")
	}
	if _, _, err := s.probe(ctx); err != nil {
		return nil, err
	}
	arguments := []string{"--profile", string(profile)}
	if budgetMs != ProfileBudget {
		arguments = append(arguments, "--budget-ms", strconv.Itoa(budgetMs))
	}
	// After "--" the command reads a file name, even one that starts with a dash.
	arguments = append(arguments, "--", imagePath)
	exit, stdout, stderr, err := s.run(ctx, arguments)
	if err != nil {
		return nil, err
	}
	if exit != 0 && exit != 1 {
		return nil, refusal(exit, stderr)
	}
	var decoded struct {
		Detections []struct {
			Symbology string `json:"symbology"`
			Content   struct {
				Text string `json:"text"`
				Raw  []byte `json:"raw"`
			} `json:"content"`
		} `json:"detections"`
		Score *struct {
			Value int `json:"value"`
		} `json:"score"`
		Trace struct {
			BudgetExhausted bool `json:"budget_exhausted"`
		} `json:"trace"`
		Versions struct {
			Scanner string `json:"scanner"`
		} `json:"versions"`
	}
	if err := json.Unmarshal(stdout, &decoded); err != nil {
		return nil, &ScanError{ExitCode: exit, Message: "qrscan did not print a JSON report: " + err.Error()}
	}
	report := &Report{JSON: stdout, ExitCode: exit, Complete: !decoded.Trace.BudgetExhausted, EngineVersion: decoded.Versions.Scanner}
	for _, row := range decoded.Detections {
		report.Detections = append(report.Detections, Detection{Symbology: row.Symbology, Text: row.Content.Text, Raw: row.Content.Raw})
	}
	if decoded.Score != nil {
		report.Score = &Score{Value: decoded.Score.Value}
	}
	return report, nil
}

// Capabilities returns what the installed command can read, as the JSON it printed: its
// versions, decode engines and symbologies.
func (s *Scanner) Capabilities(ctx context.Context) ([]byte, error) {
	capabilities, _, err := s.probe(ctx)
	return capabilities, err
}

// EngineVersion returns the version of the installed engine, such as 0.11.0. It fails with
// UnsupportedVersionError when that version is outside the supported line.
func (s *Scanner) EngineVersion(ctx context.Context) (string, error) {
	_, version, err := s.probe(ctx)
	return version, err
}

// probe asks the command what it is and keeps the answer. A command that could not run, or a
// call that was cancelled, is not remembered: the next call asks again.
func (s *Scanner) probe(ctx context.Context) ([]byte, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.probed {
		return s.capabilities, s.version, s.failure
	}
	exit, stdout, _, err := s.run(ctx, []string{"--capabilities"})
	if err != nil {
		return nil, "", err
	}
	var decoded struct {
		Versions struct {
			Scanner string `json:"scanner"`
		} `json:"versions"`
	}
	s.probed = true
	if exit != 0 || json.Unmarshal(stdout, &decoded) != nil {
		s.failure = &UnsupportedVersionError{}
		return nil, "", s.failure
	}
	s.capabilities, s.version = stdout, decoded.Versions.Scanner
	if !strings.HasPrefix(s.version, SupportedEngine+".") {
		s.failure = &UnsupportedVersionError{Version: s.version}
	}
	return s.capabilities, s.version, s.failure
}

// run starts the command with these arguments and waits for it. The error is nil when the
// command ran, whatever its exit code.
func (s *Scanner) run(ctx context.Context, arguments []string) (exit int, stdout, stderr []byte, err error) {
	// A list, not a string: the program is started directly, with no shell in between.
	command := exec.CommandContext(ctx, s.binary, arguments...)
	var out, errOut bytes.Buffer
	command.Stdout, command.Stderr = &out, &errOut
	err = command.Run()
	if ctx.Err() != nil {
		return 0, nil, nil, fmt.Errorf("qrscan: the command was stopped: %w", ctx.Err())
	}
	var exited *exec.ExitError
	switch {
	case err == nil:
		return 0, out.Bytes(), errOut.Bytes(), nil
	case errors.As(err, &exited):
		return exited.ExitCode(), out.Bytes(), errOut.Bytes(), nil
	default:
		return 0, nil, nil, fmt.Errorf("%w (%s): %v", ErrBinaryNotFound, s.binary, err)
	}
}

var engineCode = regexp.MustCompile(`\[(QRS-\d{3})\]`)

func refusal(exit int, stderr []byte) *ScanError {
	failure := &ScanError{ExitCode: exit}
	if match := engineCode.FindSubmatch(stderr); match != nil {
		failure.EngineCode = string(match[1])
	}
	line, _, _ := strings.Cut(strings.TrimSpace(string(stderr)), "\n")
	line = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), "✖"))
	line = strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f {
			return ' '
		}
		return r
	}, line)
	if len(line) > 300 {
		line = line[:300]
	}
	failure.Message = line
	return failure
}
