// SPDX-License-Identifier: AGPL-3.0-or-later

package qrscan

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"image"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"runtime"
	"sort"
	"strings"
	"testing"
	"time"
)

// The tests run against a real installed qrscan: QRSCAN_BINARY names it and QRSCAN_FIXTURES is
// the fixtures directory of the engine repository. Nothing is simulated except the stand-in
// commands of the version and cancellation cases.

const (
	qr      = "https://qrc-ai.com/76xMa"
	code128 = "STOCK-4827"
)

func need(t testing.TB, name string) string {
	t.Helper()
	value := os.Getenv(name)
	if value == "" {
		t.Fatalf("set %s", name)
	}
	return value
}

func binary(t testing.TB) string { return need(t, "QRSCAN_BINARY") }

func fixture(t testing.TB, relative string) string {
	t.Helper()
	path := filepath.Join(need(t, "QRSCAN_FIXTURES"), relative)
	if _, err := os.Stat(path); err != nil {
		t.Fatal(err)
	}
	return path
}

func mixed(t testing.TB) string { return fixture(t, "symbology/mixed-code128-qr.png") }

// contents lists each detection as symbology, text and exact bytes, sorted.
func contents(r *Report) [][3]string {
	rows := [][3]string{}
	for _, d := range r.Detections {
		rows = append(rows, [3]string{d.Symbology, d.Text, string(d.Raw)})
	}
	sort.Slice(rows, func(a, b int) bool { return rows[a][0] < rows[b][0] })
	return rows
}

var both = [][3]string{{"code128", code128, code128}, {"qr_code", qr, qr}}

func copyFile(t testing.TB, from, to string) {
	t.Helper()
	data, err := os.ReadFile(from)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(to, data, 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestMixedImageReturnsBothCodesExactly(t *testing.T) {
	for _, profile := range []Profile{Fast, Frame, Full} {
		report, err := New(binary(t)).Scan(context.Background(), mixed(t), profile, Unbounded)
		if err != nil {
			t.Fatalf("%s: %v", profile, err)
		}
		if got := contents(report); !reflect.DeepEqual(got, both) {
			t.Errorf("%s: detections %v, want each code once with its exact text and bytes", profile, got)
		}
		if report.ExitCode != 0 || !report.Found() || !report.Complete || report.EngineVersion != "0.11.0" {
			t.Errorf("%s: exit %d, found %v, complete %v, engine %q", profile, report.ExitCode, report.Found(), report.Complete, report.EngineVersion)
		}
		if profile == Frame && report.Score != nil {
			t.Errorf("frame: the frame profile never judges")
		}
		if profile == Full && report.Score == nil {
			t.Errorf("full: no score")
		}
	}
}

func TestFullProfileJudgesACleanCode(t *testing.T) {
	report, err := New(binary(t)).Scan(context.Background(), fixture(t, "clean/gen_v5_q.png"), Full, Unbounded)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Detections) != 1 || report.Detections[0].Text != "https://qrcode-ai.com/c/v5q" || report.Score == nil || report.Score.Value != 100 {
		t.Fatalf("got %+v, score %+v", report.Detections, report.Score)
	}
}

// untimed removes what legitimately differs between two runs: the measured times.
func untimed(t testing.TB, data []byte) map[string]any {
	t.Helper()
	var value map[string]any
	if err := json.Unmarshal(data, &value); err != nil {
		t.Fatal(err)
	}
	trace := value["trace"].(map[string]any)
	trace["total_ms"] = 0
	for _, stage := range trace["stages"].([]any) {
		stage.(map[string]any)["ms"] = 0
	}
	return value
}

func TestTheReportIsTheEnginesOwnJSON(t *testing.T) {
	report, err := New(binary(t)).Scan(context.Background(), mixed(t), Frame, Unbounded)
	if err != nil {
		t.Fatal(err)
	}
	direct, err := exec.Command(binary(t), "--profile", "frame", "--budget-ms", "0", "--", mixed(t)).Output()
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(untimed(t, report.JSON), untimed(t, direct)) {
		t.Errorf("the report differs from the command's own output")
	}
	if !bytes.HasPrefix(report.JSON, []byte("{")) {
		t.Errorf("JSON is not the text the command printed")
	}
}

func TestAnImageWithNoCodeIsAResultNotAnError(t *testing.T) {
	white := image.NewGray(image.Rect(0, 0, 64, 64))
	for i := range white.Pix {
		white.Pix[i] = 0xff
	}
	path := filepath.Join(t.TempDir(), "white.png")
	file, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := png.Encode(file, white); err != nil {
		t.Fatal(err)
	}
	file.Close()
	report, err := New(binary(t)).Scan(context.Background(), path, Full, Unbounded)
	if err != nil {
		t.Fatal(err)
	}
	if report.ExitCode != 1 || report.Found() || len(report.Detections) != 0 || report.Score != nil || !report.Complete {
		t.Fatalf("got exit %d, %+v, score %+v, complete %v", report.ExitCode, report.Detections, report.Score, report.Complete)
	}
}

func TestAFileNameIsNeverInterpreted(t *testing.T) {
	names := []string{"label with spaces.png", "-profile.png", "--budget-ms.png", "étiquette-café.png"}
	if runtime.GOOS != "windows" {
		// Windows file names cannot hold a quote or a pipe.
		names = append(names, `it's "quoted".png`, "$(touch pwned);`id`&|.png")
	}
	directory := t.TempDir()
	for _, name := range names {
		path := filepath.Join(directory, name)
		copyFile(t, mixed(t), path)
		report, err := New(binary(t)).Scan(context.Background(), path, Frame, Unbounded)
		if err != nil {
			t.Fatalf("%q: %v", name, err)
		}
		if got := contents(report); !reflect.DeepEqual(got, both) {
			t.Errorf("%q: detections %v", name, got)
		}
	}
	for _, trace := range []string{filepath.Join(directory, "pwned"), "pwned"} {
		if _, err := os.Stat(trace); err == nil {
			t.Errorf("a file name was run as a command: %s exists", trace)
		}
	}
}

func TestARelativeNameThatLooksLikeAnOptionIsStillAFile(t *testing.T) {
	directory := t.TempDir()
	before, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	scanner := New(binary(t))
	if _, err := scanner.EngineVersion(context.Background()); err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(directory); err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(before)
	for _, name := range []string{"-profile.png", "--capabilities", "--budget-ms=1.png"} {
		copyFile(t, mixed(t), name)
		// A relative name reaches the command as written: only the separator keeps it a file.
		report, err := scanner.Scan(context.Background(), name, Frame, Unbounded)
		if err != nil {
			t.Fatalf("%q: %v", name, err)
		}
		if got := contents(report); !reflect.DeepEqual(got, both) {
			t.Errorf("%q: detections %v", name, got)
		}
	}
}

func TestAFileThatIsNotAnImageFailsWithTheEnginesCode(t *testing.T) {
	path := filepath.Join(t.TempDir(), "notes.png")
	if err := os.WriteFile(path, []byte("not an image"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := New(binary(t)).Scan(context.Background(), path, Full, ProfileBudget)
	var refused *ScanError
	if !errors.As(err, &refused) || refused.ExitCode != 2 || refused.EngineCode != "QRS-001" || strings.Contains(refused.Message, "\n") {
		t.Fatalf("got %#v", err)
	}
}

func TestAMissingFileFails(t *testing.T) {
	_, err := New(binary(t)).Scan(context.Background(), filepath.Join(t.TempDir(), "nothing-here.png"), Full, ProfileBudget)
	var refused *ScanError
	if !errors.As(err, &refused) || refused.ExitCode != 2 || refused.EngineCode != "" {
		t.Fatalf("got %#v", err)
	}
}

func TestAMissingCommandIsReportedAndNotRemembered(t *testing.T) {
	path := filepath.Join(t.TempDir(), "qrscan-installed-later")
	scanner := New(path)
	if _, err := scanner.Scan(context.Background(), mixed(t), Frame, Unbounded); !errors.Is(err, ErrBinaryNotFound) {
		t.Fatalf("got %v", err)
	}
	if runtime.GOOS == "windows" {
		return
	}
	// Once the command exists, the same Scanner works: the failure was not kept.
	copyFile(t, binary(t), path)
	if err := os.Chmod(path, 0o755); err != nil {
		t.Fatal(err)
	}
	report, err := scanner.Scan(context.Background(), mixed(t), Frame, Unbounded)
	if err != nil || !reflect.DeepEqual(contents(report), both) {
		t.Fatalf("after the command appeared: %v", err)
	}
}

func TestCapabilitiesNameTheInstalledEngine(t *testing.T) {
	scanner := New(binary(t))
	version, err := scanner.EngineVersion(context.Background())
	if err != nil || version != "0.11.0" {
		t.Fatalf("got %q, %v", version, err)
	}
	data, err := scanner.Capabilities(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	var capabilities struct {
		Symbologies []string `json:"symbologies"`
	}
	if err := json.Unmarshal(data, &capabilities); err != nil {
		t.Fatal(err)
	}
	listed := strings.Join(capabilities.Symbologies, " ")
	if !strings.Contains(listed, "qr_code") || !strings.Contains(listed, "code128") {
		t.Fatalf("got %s", data)
	}
}

// standIn writes a command for the cases a real qrscan cannot produce. POSIX shells only.
func standIn(t *testing.T, body string) string {
	t.Helper()
	if runtime.GOOS == "windows" {
		t.Skip("the stand-in command is a shell script")
	}
	path := filepath.Join(t.TempDir(), "stand-in-qrscan")
	if err := os.WriteFile(path, []byte("#!/bin/sh\n"+body+"\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestAnotherEngineLineIsRefusedBeforeAnyScan(t *testing.T) {
	old := standIn(t, `printf '{"versions":{"scanner":"0.9.0","pipeline":4,"score_contract":4},"engines":[],"symbologies":[]}'`)
	_, err := New(old).Scan(context.Background(), mixed(t), Frame, Unbounded)
	var refused *UnsupportedVersionError
	if !errors.As(err, &refused) || refused.Version != "0.9.0" || !strings.Contains(err.Error(), SupportedEngine) {
		t.Fatalf("got %#v", err)
	}
}

func TestACommandWithoutCapabilitiesIsRefused(t *testing.T) {
	_, err := New(standIn(t, `echo "error: unexpected argument" >&2; exit 2`)).Scan(context.Background(), mixed(t), Frame, Unbounded)
	var refused *UnsupportedVersionError
	if !errors.As(err, &refused) || refused.Version != "" {
		t.Fatalf("got %#v", err)
	}
}

func TestACancelledContextStopsTheCommand(t *testing.T) {
	slow := standIn(t, "exec sleep 30")
	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel()
	started := time.Now()
	_, err := New(slow).EngineVersion(ctx)
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("got %v", err)
	}
	if waited := time.Since(started); waited > 5*time.Second {
		t.Errorf("the wait ended after %v, not near the deadline", waited)
	}
}

func TestAContextAlreadyCancelledNeverScans(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	scanner := New(binary(t))
	if _, err := scanner.Scan(ctx, mixed(t), Frame, Unbounded); !errors.Is(err, context.Canceled) {
		t.Fatalf("got %v", err)
	}
	// The cancelled call is not remembered: the same Scanner then works.
	report, err := scanner.Scan(context.Background(), mixed(t), Frame, Unbounded)
	if err != nil || !reflect.DeepEqual(contents(report), both) {
		t.Fatalf("after a cancelled call: %v", err)
	}
}

func TestArgumentsAreChecked(t *testing.T) {
	scanner := New(binary(t))
	for name, call := range map[string]func() error{
		"an empty path":      func() error { _, err := scanner.Scan(context.Background(), "", Frame, Unbounded); return err },
		"an unknown profile": func() error { _, err := scanner.Scan(context.Background(), mixed(t), "typo", Unbounded); return err },
		"a negative budget":  func() error { _, err := scanner.Scan(context.Background(), mixed(t), Frame, -2); return err },
	} {
		err := call()
		var refused *ScanError
		if err == nil || errors.As(err, &refused) {
			t.Errorf("%s: got %v, want a refusal before the command starts", name, err)
		}
	}
	if New("").binary != "qrscan" {
		t.Errorf("an empty name does not mean qrscan on PATH")
	}
}
